const express = require("express");
const router  = express.Router();
const pool    = require("../../database/db");
const jwt     = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// ─── Middleware: verify JWT token ──────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token      = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.clinic_id = decoded.clinic_id;
    req.username  = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
}

router.use(authenticateToken);

// ─── GET /api/calls — fetch all calls for clinic ───────────────────────────
// Query params:
//   clinic_id (required) — the clinic to fetch calls for
//   type (optional) — filter by type: incoming, outgoing
//   agent_type (optional) — filter by agent type: ai, human
//   start_date (optional) — ISO date YYYY-MM-DD to filter from
//   end_date (optional) — ISO date YYYY-MM-DD to filter until
//   page (optional) — pagination (default: 1)
//   limit (optional) — items per page (default: 20)
router.get("/", async (req, res) => {
  try {
    const { clinic_id, type, agent_type, start_date, end_date, page = 1, limit = 20 } = req.query;

    // ── Verify clinic_id matches authenticated user's clinic ────────────────────
    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id query param required" });
    }

    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // ── Build dynamic query ────────────────────────────────────────────────────
    let query = `
      SELECT
        id,
        clinic_id,
        time,
        type,
        caller,
        agent_type,
        duration,
        ai_summary,
        recording,
        created_at,
        updated_at
      FROM calls
      WHERE clinic_id = $1
    `;

    const params = [clinic_id];
    let paramIdx = 2;

    // Filter by type if provided
    if (type) {
      const allowed = ["incoming", "outgoing"];
      if (!allowed.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid type. Allowed: ${allowed.join(", ")}`,
        });
      }
      query += ` AND type = $${paramIdx++}`;
      params.push(type);
    }

    // Filter by agent_type if provided
    if (agent_type) {
      const allowed = ["ai", "human"];
      if (!allowed.includes(agent_type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid agent_type. Allowed: ${allowed.join(", ")}`,
        });
      }
      query += ` AND agent_type = $${paramIdx++}`;
      params.push(agent_type);
    }

    // Filter by date range if provided
    if (start_date) {
      query += ` AND DATE(time) >= $${paramIdx++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(time) <= $${paramIdx++}`;
      params.push(end_date);
    }

    // Order by time descending (most recent first)
    query += ` ORDER BY time DESC`;

    // ── Calculate pagination ────────────────────────────────────────────────────
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), offset);

    // ── Execute query ──────────────────────────────────────────────────────────
    const result = await pool.query(query, params);

    // ── Get total count for pagination ──────────────────────────────────────────
    let countQuery = `SELECT COUNT(*) FROM calls WHERE clinic_id = $1`;
    const countParams = [clinic_id];
    let countParamIdx = 2;

    if (type) {
      countQuery += ` AND type = $${countParamIdx++}`;
      countParams.push(type);
    }

    if (agent_type) {
      countQuery += ` AND agent_type = $${countParamIdx++}`;
      countParams.push(agent_type);
    }

    if (start_date) {
      countQuery += ` AND DATE(time) >= $${countParamIdx++}`;
      countParams.push(start_date);
    }

    if (end_date) {
      countQuery += ` AND DATE(time) <= $${countParamIdx++}`;
      countParams.push(end_date);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Calls fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/calls/:id — fetch single call ───────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         id,
         clinic_id,
         time,
         type,
         caller,
         agent_type,
         duration,
         ai_summary,
         recording,
         created_at,
         updated_at
       FROM calls
       WHERE id = $1
         AND clinic_id = $2`,
      [id, req.clinic_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Call not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Call fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/calls — create call record ──────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { type, caller, agent_type = "ai", duration = 0, ai_summary, recording } = req.body;

    if (!type || !caller) {
      return res.status(400).json({
        success: false,
        error: "type and caller are required",
      });
    }

    const allowed_types = ["incoming", "outgoing"];
    if (!allowed_types.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type. Allowed: ${allowed_types.join(", ")}`,
      });
    }

    const allowed_agents = ["ai", "human"];
    if (!allowed_agents.includes(agent_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid agent_type. Allowed: ${allowed_agents.join(", ")}`,
      });
    }

    // ── Insert call ────────────────────────────────────────────────────────────
    const result = await pool.query(
      `INSERT INTO calls (clinic_id, type, caller, agent_type, duration, ai_summary, recording)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, clinic_id, time, type, caller, agent_type, duration, ai_summary, recording, created_at`,
      [req.clinic_id, type, caller, agent_type, duration, ai_summary || null, recording || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Call creation error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/calls/:id — update call details ────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { duration, ai_summary, recording } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (duration !== undefined) {
      updates.push(`duration = $${paramCount++}`);
      values.push(duration);
    }

    if (ai_summary !== undefined) {
      updates.push(`ai_summary = $${paramCount++}`);
      values.push(ai_summary);
    }

    if (recording !== undefined) {
      updates.push(`recording = $${paramCount++}`);
      values.push(recording);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, req.clinic_id);

    const query = `
      UPDATE calls
      SET ${updates.join(", ")}
      WHERE id = $${paramCount++}
        AND clinic_id = $${paramCount}
      RETURNING id, clinic_id, time, type, caller, agent_type, duration, ai_summary, recording, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Call not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Call update error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── GET /api/calls/stats — get call statistics ────────────────────────────
router.get("/stats/summary", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT
        COUNT(*) AS total_calls,
        COUNT(*) FILTER (WHERE type = 'incoming') AS incoming_calls,
        COUNT(*) FILTER (WHERE type = 'outgoing') AS outgoing_calls,
        COUNT(*) FILTER (WHERE agent_type = 'ai') AS ai_calls,
        COUNT(*) FILTER (WHERE agent_type = 'human') AS human_calls,
        ROUND(AVG(duration)::numeric, 2) AS avg_duration,
        SUM(duration) AS total_duration,
        MAX(time) AS last_call_time,
        MIN(time) AS first_call_time
      FROM calls
      WHERE clinic_id = $1
    `;

    const params = [req.clinic_id];
    let paramIdx = 2;

    if (start_date) {
      query += ` AND DATE(time) >= $${paramIdx++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(time) <= $${paramIdx++}`;
      params.push(end_date);
    }

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Call stats error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
