const express = require("express");
const router  = express.Router();
const pool    = require("../../database/db");
const { authenticateToken, authenticateAdminToken } = require("../middleware");

// ─── Columns returned in every SELECT ──────────────────────────────────────────
const SELECT_COLS = `
  id,
  call_id,
  clinic_id,
  duration_seconds,
  duration_minutes,
  stt_cost,
  stt_provider,
  tts_cost,
  tts_provider,
  tts_chars,
  llm_in_cost,
  llm_in_tokens,
  llm_out_cost,
  llm_out_tokens,
  telephony_cost,
  telephony_provider,
  whatsapp_cost,
  whatsapp_msg_type,
  other_cost,
  total_cost,
  cost_per_minute,
  credits_billed,
  balance_after,
  extra_costs,
  phone_number,
  created_at,
  updated_at
`;

const SELECT_WITH_CALLER_COLS = `
  cb.id,
  cb.call_id,
  cb.clinic_id,
  cb.duration_seconds,
  cb.duration_minutes,
  cb.stt_cost,
  cb.stt_provider,
  cb.tts_cost,
  cb.tts_provider,
  cb.tts_chars,
  cb.llm_in_cost,
  cb.llm_in_tokens,
  cb.llm_out_cost,
  cb.llm_out_tokens,
  cb.telephony_cost,
  cb.telephony_provider,
  cb.whatsapp_cost,
  cb.whatsapp_msg_type,
  cb.other_cost,
  cb.total_cost,
  cb.cost_per_minute,
  cb.credits_billed,
  cb.balance_after,
  cb.extra_costs,
  cb.phone_number,
  cb.created_at,
  cb.updated_at,
  c.caller AS caller_phone
`;

// ─────────────────────────────────────────────────────────────────────────────
// CLINIC-SCOPED ROUTES  (require clinic JWT)
// ─────────────────────────────────────────────────────────────────────────────

// ─── GET /api/call-cost-breakdown/by-call/:call_id ────────────────────────────
// Fetch cost breakdown for a single call (clinic-scoped).
router.get("/by-call/:call_id", authenticateToken, async (req, res) => {
  try {
    const { call_id } = req.params;

    const result = await pool.query(
      `SELECT ${SELECT_COLS}
       FROM call_cost_breakdown
       WHERE call_id = $1 AND clinic_id = $2`,
      [call_id, req.clinic_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Cost breakdown not found for this call",
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("call-cost-breakdown fetch by call error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/call-cost-breakdown/clinic-summary ─────────────────────────────
// Aggregated cost summary for the authenticated clinic.
// Query params:
//   start_date (optional) — ISO date YYYY-MM-DD
//   end_date   (optional) — ISO date YYYY-MM-DD
router.get("/clinic-summary", authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT
        COUNT(*)                        AS total_calls,
        COALESCE(SUM(total_cost), 0)    AS total_cost,
        COALESCE(SUM(stt_cost), 0)      AS total_stt_cost,
        COALESCE(SUM(tts_cost), 0)      AS total_tts_cost,
        COALESCE(SUM(llm_in_cost), 0)   AS total_llm_in_cost,
        COALESCE(SUM(llm_out_cost), 0)  AS total_llm_out_cost,
        COALESCE(SUM(telephony_cost), 0) AS total_telephony_cost,
        COALESCE(SUM(whatsapp_cost), 0) AS total_whatsapp_cost,
        COALESCE(SUM(other_cost), 0)    AS total_other_cost,
        COALESCE(SUM(credits_billed), 0) AS total_credits_billed,
        COALESCE(AVG(total_cost), 0)    AS avg_cost_per_call,
        COALESCE(AVG(duration_minutes), 0) AS avg_duration_minutes,
        COALESCE(SUM(CEIL(duration_minutes)), 0) AS total_billed_duration_minutes,
        COALESCE(SUM(llm_in_tokens), 0)  AS total_llm_in_tokens,
        COALESCE(SUM(llm_out_tokens), 0) AS total_llm_out_tokens,
        COALESCE(SUM(tts_chars), 0)     AS total_tts_chars
      FROM call_cost_breakdown
      WHERE clinic_id = $1
    `;

    const params = [req.clinic_id];
    let paramIdx = 2;

    if (start_date) {
      query += ` AND DATE(created_at) >= $${paramIdx++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(created_at) <= $${paramIdx++}`;
      params.push(end_date);
    }

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("call-cost-breakdown clinic summary error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/call-cost-breakdown ────────────────────────────────────────────
// List all cost breakdowns for the authenticated clinic, with filters and pagination.
// Query params:
//   start_date (optional) — YYYY-MM-DD
//   end_date   (optional) — YYYY-MM-DD
//   page       (optional, default 1)
//   limit      (optional, default 20)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT ${SELECT_WITH_CALLER_COLS}
      FROM call_cost_breakdown cb
      LEFT JOIN calls c ON cb.call_id = c.id
      WHERE cb.clinic_id = $1
    `;
    const params = [req.clinic_id];
    let paramIdx = 2;

    if (start_date) {
      query += ` AND DATE(cb.created_at) >= $${paramIdx++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(cb.created_at) <= $${paramIdx++}`;
      params.push(end_date);
    }

    // Count query (before adding ORDER BY / LIMIT)
    const countResult = await pool.query(
      query.replace(/SELECT[\s\S]+?FROM/, "SELECT COUNT(*) FROM"),
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    query += ` ORDER BY cb.created_at DESC`;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

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
    console.error("call-cost-breakdown list error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL / ADMIN ROUTES  (no clinic-ownership check — used by call_agent)
// ─────────────────────────────────────────────────────────────────────────────

// ─── POST /api/call-cost-breakdown ───────────────────────────────────────────
// Create a cost-breakdown record (called by the call_agent after a call ends).
// Body: see schema above — call_id is required; all cost fields default to 0.
router.post("/", async (req, res) => {
  try {
    const {
      call_id,
      clinic_id,
      duration_seconds   = 0,
      duration_minutes   = 0,
      stt_cost           = 0,
      stt_provider,
      tts_cost           = 0,
      tts_provider,
      tts_chars          = 0,
      llm_in_cost        = 0,
      llm_in_tokens      = 0,
      llm_out_cost       = 0,
      llm_out_tokens     = 0,
      telephony_cost     = 0,
      telephony_provider = "Exotel",
      whatsapp_cost      = 0,
      whatsapp_msg_type,
      other_cost         = 0,
      cost_per_minute,
      credits_billed,
      balance_after,
      extra_costs        = {},
      phone_number,
    } = req.body;

    if (!call_id) {
      return res.status(400).json({ success: false, error: "call_id is required" });
    }

    // Resolve phone number if not provided
    let resolved_phone_number = phone_number;
    if (!resolved_phone_number) {
      const callRes = await pool.query("SELECT caller FROM calls WHERE id = $1", [call_id]);
      if (callRes.rows.length > 0) {
        resolved_phone_number = callRes.rows[0].caller;
      }
    }

    const result = await pool.query(
      `INSERT INTO call_cost_breakdown (
         call_id, clinic_id,
         duration_seconds, duration_minutes,
         stt_cost, stt_provider,
         tts_cost, tts_provider, tts_chars,
         llm_in_cost, llm_in_tokens,
         llm_out_cost, llm_out_tokens,
         telephony_cost, telephony_provider,
         whatsapp_cost, whatsapp_msg_type,
         other_cost,
         cost_per_minute,
         credits_billed, balance_after,
         extra_costs, phone_number
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9,
         $10, $11, $12, $13, $14, $15, $16, $17,
         $18, $19, $20, $21, $22, $23
       )
       RETURNING ${SELECT_COLS}`,
      [
        call_id, clinic_id || null,
        duration_seconds, duration_minutes,
        stt_cost, stt_provider || null,
        tts_cost, tts_provider || null, tts_chars,
        llm_in_cost, llm_in_tokens,
        llm_out_cost, llm_out_tokens,
        telephony_cost, telephony_provider,
        whatsapp_cost, whatsapp_msg_type || null,
        other_cost,
        cost_per_minute !== undefined ? cost_per_minute : null,
        credits_billed !== undefined ? credits_billed : null,
        balance_after  !== undefined ? balance_after  : null,
        JSON.stringify(extra_costs),
        resolved_phone_number || null,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    // Duplicate call_id → 409 Conflict
    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        error: "A cost breakdown already exists for this call_id",
      });
    }
    console.error("call-cost-breakdown create error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/call-cost-breakdown/:id ──────────────────────────────────────
// Partial update by primary-key id.  All cost fields are optional.
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const allowedFields = [
      "duration_seconds", "duration_minutes",
      "stt_cost", "stt_provider",
      "tts_cost", "tts_provider", "tts_chars",
      "llm_in_cost", "llm_in_tokens",
      "llm_out_cost", "llm_out_tokens",
      "telephony_cost", "telephony_provider",
      "whatsapp_cost", "whatsapp_msg_type",
      "other_cost",
      "cost_per_minute",
      "credits_billed", "balance_after",
      "extra_costs",
      "phone_number",
    ];

    const updates = [];
    const values  = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        values.push(
          field === "extra_costs"
            ? JSON.stringify(req.body[field])
            : req.body[field]
        );
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: "No valid fields provided for update" });
    }

    // updated_at is handled by the DB trigger, but we can set it explicitly too
    values.push(id);

    const query = `
      UPDATE call_cost_breakdown
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING ${SELECT_COLS}
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Cost breakdown not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("call-cost-breakdown update error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/call-cost-breakdown/by-call/:call_id ─────────────────────────
// Upsert (insert or update) by call_id — convenient for the call_agent which
// may want to write the breakdown without knowing the internal `id`.
router.patch("/by-call/:call_id", async (req, res) => {
  try {
    const { call_id } = req.params;

    const {
      clinic_id,
      duration_seconds, duration_minutes,
      stt_cost, stt_provider,
      tts_cost, tts_provider, tts_chars,
      llm_in_cost, llm_in_tokens,
      llm_out_cost, llm_out_tokens,
      telephony_cost, telephony_provider,
      whatsapp_cost, whatsapp_msg_type,
      other_cost,
      cost_per_minute,
      credits_billed, balance_after,
      extra_costs,
      phone_number,
    } = req.body;

    // Resolve phone number if not provided
    let resolved_phone_number = phone_number;
    if (!resolved_phone_number) {
      const callRes = await pool.query("SELECT caller FROM calls WHERE id = $1", [call_id]);
      if (callRes.rows.length > 0) {
        resolved_phone_number = callRes.rows[0].caller;
      }
    }

    const result = await pool.query(
      `INSERT INTO call_cost_breakdown (
         call_id, clinic_id,
         duration_seconds, duration_minutes,
         stt_cost, stt_provider,
         tts_cost, tts_provider, tts_chars,
         llm_in_cost, llm_in_tokens,
         llm_out_cost, llm_out_tokens,
         telephony_cost, telephony_provider,
         whatsapp_cost, whatsapp_msg_type,
         other_cost, cost_per_minute,
         credits_billed, balance_after, extra_costs,
         phone_number
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9,
         $10, $11, $12, $13, $14, $15, $16, $17,
         $18, $19, $20, $21, $22, $23
       )
       ON CONFLICT (call_id) DO UPDATE SET
         clinic_id          = COALESCE(EXCLUDED.clinic_id,          call_cost_breakdown.clinic_id),
         duration_seconds   = COALESCE(EXCLUDED.duration_seconds,   call_cost_breakdown.duration_seconds),
         duration_minutes   = COALESCE(EXCLUDED.duration_minutes,   call_cost_breakdown.duration_minutes),
         stt_cost           = COALESCE(EXCLUDED.stt_cost,           call_cost_breakdown.stt_cost),
         stt_provider       = COALESCE(EXCLUDED.stt_provider,       call_cost_breakdown.stt_provider),
         tts_cost           = COALESCE(EXCLUDED.tts_cost,           call_cost_breakdown.tts_cost),
         tts_provider       = COALESCE(EXCLUDED.tts_provider,       call_cost_breakdown.tts_provider),
         tts_chars          = COALESCE(EXCLUDED.tts_chars,          call_cost_breakdown.tts_chars),
         llm_in_cost        = COALESCE(EXCLUDED.llm_in_cost,        call_cost_breakdown.llm_in_cost),
         llm_in_tokens      = COALESCE(EXCLUDED.llm_in_tokens,      call_cost_breakdown.llm_in_tokens),
         llm_out_cost       = COALESCE(EXCLUDED.llm_out_cost,       call_cost_breakdown.llm_out_cost),
         llm_out_tokens     = COALESCE(EXCLUDED.llm_out_tokens,     call_cost_breakdown.llm_out_tokens),
         telephony_cost     = COALESCE(EXCLUDED.telephony_cost,     call_cost_breakdown.telephony_cost),
         telephony_provider = COALESCE(EXCLUDED.telephony_provider, call_cost_breakdown.telephony_provider),
         whatsapp_cost      = COALESCE(EXCLUDED.whatsapp_cost,      call_cost_breakdown.whatsapp_cost),
         whatsapp_msg_type  = COALESCE(EXCLUDED.whatsapp_msg_type,  call_cost_breakdown.whatsapp_msg_type),
         other_cost         = COALESCE(EXCLUDED.other_cost,         call_cost_breakdown.other_cost),
         cost_per_minute    = COALESCE(EXCLUDED.cost_per_minute,    call_cost_breakdown.cost_per_minute),
         credits_billed     = COALESCE(EXCLUDED.credits_billed,     call_cost_breakdown.credits_billed),
         balance_after      = COALESCE(EXCLUDED.balance_after,      call_cost_breakdown.balance_after),
         extra_costs        = COALESCE(EXCLUDED.extra_costs,        call_cost_breakdown.extra_costs),
         phone_number       = COALESCE(EXCLUDED.phone_number,       call_cost_breakdown.phone_number)
       RETURNING ${SELECT_COLS}`,
      [
        call_id,
        clinic_id           !== undefined ? clinic_id           : null,
        duration_seconds    !== undefined ? duration_seconds    : 0,
        duration_minutes    !== undefined ? duration_minutes    : 0,
        stt_cost            !== undefined ? stt_cost            : 0,
        stt_provider        !== undefined ? stt_provider        : null,
        tts_cost            !== undefined ? tts_cost            : 0,
        tts_provider        !== undefined ? tts_provider        : null,
        tts_chars           !== undefined ? tts_chars           : 0,
        llm_in_cost         !== undefined ? llm_in_cost         : 0,
        llm_in_tokens       !== undefined ? llm_in_tokens       : 0,
        llm_out_cost        !== undefined ? llm_out_cost        : 0,
        llm_out_tokens      !== undefined ? llm_out_tokens      : 0,
        telephony_cost      !== undefined ? telephony_cost      : 0,
        telephony_provider  !== undefined ? telephony_provider  : "Exotel",
        whatsapp_cost       !== undefined ? whatsapp_cost       : 0,
        whatsapp_msg_type   !== undefined ? whatsapp_msg_type   : null,
        other_cost          !== undefined ? other_cost          : 0,
        cost_per_minute     !== undefined ? cost_per_minute     : null,
        credits_billed      !== undefined ? credits_billed      : null,
        balance_after       !== undefined ? balance_after       : null,
        extra_costs         !== undefined ? JSON.stringify(extra_costs) : "{}",
        resolved_phone_number !== undefined ? resolved_phone_number : null,
      ]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("call-cost-breakdown upsert by-call error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/call-cost-breakdown/:id ─────────────────────────────────────
// Hard-delete by primary-key id (admin / internal use).
router.delete("/:id", authenticateAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM call_cost_breakdown WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Cost breakdown not found" });
    }

    res.json({ success: true, message: "Cost breakdown deleted", deleted_id: id });
  } catch (err) {
    console.error("call-cost-breakdown delete error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES  (require admin JWT)
// ─────────────────────────────────────────────────────────────────────────────

// ─── GET /api/call-cost-breakdown/admin/all ───────────────────────────────────
// List ALL breakdowns across every clinic, with optional filters and pagination.
// Query params:
//   clinic_id  (optional) — filter to a single clinic
//   start_date (optional) — YYYY-MM-DD
//   end_date   (optional) — YYYY-MM-DD
//   page       (optional, default 1)
//   limit      (optional, default 20)
router.get("/admin/all", authenticateAdminToken, async (req, res) => {
  try {
    const { clinic_id, start_date, end_date, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT ${SELECT_WITH_CALLER_COLS}
      FROM call_cost_breakdown cb
      LEFT JOIN calls c ON cb.call_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (clinic_id) {
      query += ` AND cb.clinic_id = $${paramIdx++}`;
      params.push(clinic_id);
    }

    if (start_date) {
      query += ` AND DATE(cb.created_at) >= $${paramIdx++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(cb.created_at) <= $${paramIdx++}`;
      params.push(end_date);
    }

    const countResult = await pool.query(
      query.replace(/SELECT[\s\S]+?FROM/, "SELECT COUNT(*) FROM"),
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    query += ` ORDER BY cb.created_at DESC`;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

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
    console.error("call-cost-breakdown admin/all error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/call-cost-breakdown/admin/summary ───────────────────────────────
// Platform-wide aggregated cost summary, optionally scoped to one clinic.
// Query params:
//   clinic_id  (optional)
//   start_date (optional)
//   end_date   (optional)
router.get("/admin/summary", authenticateAdminToken, async (req, res) => {
  try {
    const { clinic_id, start_date, end_date } = req.query;

    let query = `
      SELECT
        COUNT(*)                          AS total_calls,
        COALESCE(SUM(total_cost), 0)      AS total_cost,
        COALESCE(SUM(stt_cost), 0)        AS total_stt_cost,
        COALESCE(SUM(tts_cost), 0)        AS total_tts_cost,
        COALESCE(SUM(llm_in_cost), 0)     AS total_llm_in_cost,
        COALESCE(SUM(llm_out_cost), 0)    AS total_llm_out_cost,
        COALESCE(SUM(telephony_cost), 0)  AS total_telephony_cost,
        COALESCE(SUM(whatsapp_cost), 0)   AS total_whatsapp_cost,
        COALESCE(SUM(other_cost), 0)      AS total_other_cost,
        COALESCE(SUM(credits_billed), 0)  AS total_credits_billed,
        COALESCE(AVG(total_cost), 0)      AS avg_cost_per_call,
        COALESCE(AVG(duration_minutes), 0) AS avg_duration_minutes,
        COALESCE(SUM(CEIL(duration_minutes)), 0) AS total_billed_duration_minutes,
        COALESCE(SUM(llm_in_tokens), 0)   AS total_llm_in_tokens,
        COALESCE(SUM(llm_out_tokens), 0)  AS total_llm_out_tokens,
        COALESCE(SUM(tts_chars), 0)       AS total_tts_chars
      FROM call_cost_breakdown
      WHERE 1=1
    `;

    const params = [];
    let paramIdx = 1;

    if (clinic_id) {
      query += ` AND clinic_id = $${paramIdx++}`;
      params.push(clinic_id);
    }

    if (start_date) {
      query += ` AND DATE(created_at) >= $${paramIdx++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(created_at) <= $${paramIdx++}`;
      params.push(end_date);
    }

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("call-cost-breakdown admin/summary error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
