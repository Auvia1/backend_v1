const express = require("express");
const router = express.Router();
const pool = require("../../database/db");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// ─── Middleware: verify JWT token ──────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.clinic_id = decoded.clinic_id;
    req.username = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
}

router.use(authenticateToken);

// ─── Helper: Validate time format (HH:MM:SS) ──────────────────────────────
function isValidTimeFormat(timeStr) {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
  return timeRegex.test(timeStr);
}

// ─── Helper: Validate date format (YYYY-MM-DD) ─────────────────────────────
function isValidDateFormat(dateStr) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  return !isNaN(Date.parse(dateStr));
}

// ─── Helper: Compare times (as strings HH:MM:SS) ────────────────────────────
function isTimeAfter(time1, time2) {
  return time1 > time2; // String comparison works for HH:MM:SS format
}

// ─── POST /api/slots — Create a new recurring slot ─────────────────────────
// Required: clinic_id, doctor_id, day_of_week, start_time, end_time, max_appointments_per_slot
// Optional: status (default: 'open'), effective_from, effective_to
router.post("/", async (req, res) => {
  try {
    const {
      clinic_id,
      doctor_id,
      day_of_week,
      start_time,
      end_time,
      max_appointments_per_slot,
      status = "open",
      effective_from,
      effective_to,
    } = req.body;

    // ── Validate required fields ────────────────────────────────────────────
    if (!clinic_id || !doctor_id || day_of_week === undefined || day_of_week === null || !start_time || !end_time || !max_appointments_per_slot) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: clinic_id, doctor_id, day_of_week, start_time, end_time, max_appointments_per_slot",
      });
    }

    // ── Verify clinic_id matches authenticated user's clinic ────────────────
    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // ── Validate day_of_week (0-6: Sunday-Saturday) ────────────────────────
    if (!Number.isInteger(day_of_week) || day_of_week < 0 || day_of_week > 6) {
      return res.status(400).json({
        success: false,
        error: "day_of_week must be an integer between 0 (Sunday) and 6 (Saturday)",
      });
    }

    // ── Validate time format ────────────────────────────────────────────────
    if (!isValidTimeFormat(start_time)) {
      return res.status(400).json({
        success: false,
        error: "start_time must be in HH:MM:SS format (e.g., 09:00:00)",
      });
    }

    if (!isValidTimeFormat(end_time)) {
      return res.status(400).json({
        success: false,
        error: "end_time must be in HH:MM:SS format (e.g., 10:00:00)",
      });
    }

    // ── Validate times comparison ──────────────────────────────────────────
    if (!isTimeAfter(end_time, start_time)) {
      return res.status(400).json({
        success: false,
        error: "end_time must be after start_time",
      });
    }

    // ── Validate max_appointments_per_slot ─────────────────────────────────
    if (max_appointments_per_slot <= 0 || !Number.isInteger(max_appointments_per_slot)) {
      return res.status(400).json({
        success: false,
        error: "max_appointments_per_slot must be a positive integer",
      });
    }

    // ── Validate status ────────────────────────────────────────────────────
    const validStatuses = ["open", "full", "closed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // ── Validate date format if provided ───────────────────────────────────
    if (effective_from && !isValidDateFormat(effective_from)) {
      return res.status(400).json({
        success: false,
        error: "effective_from must be in YYYY-MM-DD format",
      });
    }

    if (effective_to && !isValidDateFormat(effective_to)) {
      return res.status(400).json({
        success: false,
        error: "effective_to must be in YYYY-MM-DD format",
      });
    }

    // ── Validate date range ────────────────────────────────────────────────
    if (effective_from && effective_to) {
      if (new Date(effective_to) < new Date(effective_from)) {
        return res.status(400).json({
          success: false,
          error: "effective_to must be after or equal to effective_from",
        });
      }
    }

    // ── Verify doctor exists in clinic ──────────────────────────────────────
    const doctorCheck = await pool.query(
      "SELECT id FROM doctors WHERE id = $1 AND clinic_id = $2 AND deleted_at IS NULL",
      [doctor_id, clinic_id]
    );

    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Doctor not found in this clinic",
      });
    }

    // ── Insert slot ────────────────────────────────────────────────────────
    const result = await pool.query(
      `INSERT INTO slots_for_token_system
       (clinic_id, doctor_id, day_of_week, start_time, end_time, max_appointments_per_slot, status, effective_from, effective_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [clinic_id, doctor_id, day_of_week, start_time, end_time, max_appointments_per_slot, status, effective_from || new Date().toISOString().split('T')[0], effective_to]
    );

    res.status(201).json({
      success: true,
      message: "Slot created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("POST /api/slots error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/slots — List slots with filters ──────────────────────────────
// Query params:
//   clinic_id (required)
//   doctor_id (optional)
//   day_of_week (optional): 0-6
//   status (optional): open, full, closed, cancelled
//   effective_from (optional): YYYY-MM-DD
//   effective_to (optional): YYYY-MM-DD
//   page (optional, default: 1)
//   limit (optional, default: 20)
router.get("/", async (req, res) => {
  try {
    const {
      clinic_id,
      doctor_id,
      day_of_week,
      status,
      effective_from,
      effective_to,
      page = 1,
      limit = 20,
    } = req.query;

    // ── Validate clinic_id ──────────────────────────────────────────────────
    if (!clinic_id) {
      return res.status(400).json({
        success: false,
        error: "clinic_id query param required",
      });
    }

    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // ── Build dynamic query ────────────────────────────────────────────────
    let query = `
      SELECT
        s.id,
        s.clinic_id,
        s.doctor_id,
        d.name AS doctor_name,
        d.speciality,
        s.day_of_week,
        s.start_time,
        s.end_time,
        s.max_appointments_per_slot,
        s.status,
        s.effective_from,
        s.effective_to,
        s.created_at,
        s.updated_at
      FROM slots_for_token_system s
      LEFT JOIN doctors d ON s.doctor_id = d.id
      WHERE s.clinic_id = $1
        AND s.deleted_at IS NULL
    `;

    const params = [clinic_id];
    let paramIdx = 2;

    // ── Filter by doctor_id ────────────────────────────────────────────────
    if (doctor_id) {
      query += ` AND s.doctor_id = $${paramIdx++}`;
      params.push(doctor_id);
    }

    // ── Filter by day_of_week ──────────────────────────────────────────────
    if (day_of_week !== undefined && day_of_week !== null && day_of_week !== "") {
      const dow = parseInt(day_of_week);
      if (isNaN(dow) || dow < 0 || dow > 6) {
        return res.status(400).json({
          success: false,
          error: "day_of_week must be between 0 (Sunday) and 6 (Saturday)",
        });
      }
      query += ` AND s.day_of_week = $${paramIdx++}`;
      params.push(dow);
    }

    // ── Filter by status ────────────────────────────────────────────────────
    if (status) {
      const validStatuses = ["open", "full", "closed", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `status must be one of: ${validStatuses.join(", ")}`,
        });
      }
      query += ` AND s.status = $${paramIdx++}`;
      params.push(status);
    }

    // ── Filter by effective date range ─────────────────────────────────────
    if (effective_from) {
      if (!isValidDateFormat(effective_from)) {
        return res.status(400).json({
          success: false,
          error: "effective_from must be in YYYY-MM-DD format",
        });
      }
      query += ` AND (s.effective_to IS NULL OR s.effective_to >= $${paramIdx++})`;
      params.push(effective_from);
    }

    if (effective_to) {
      if (!isValidDateFormat(effective_to)) {
        return res.status(400).json({
          success: false,
          error: "effective_to must be in YYYY-MM-DD format",
        });
      }
      query += ` AND s.effective_from <= $${paramIdx++}`;
      params.push(effective_to);
    }

    // ── Order by day_of_week and start_time ────────────────────────────────
    query += ` ORDER BY s.day_of_week ASC, s.start_time ASC`;

    // ── Pagination ──────────────────────────────────────────────────────────
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    // ── Get total count ────────────────────────────────────────────────────
    let countQuery = `
      SELECT COUNT(*) as total FROM slots_for_token_system
      WHERE clinic_id = $1 AND deleted_at IS NULL
    `;
    const countParams = [clinic_id];
    let countParamIdx = 2;

    if (doctor_id) {
      countQuery += ` AND doctor_id = $${countParamIdx++}`;
      countParams.push(doctor_id);
    }

    if (day_of_week !== undefined && day_of_week !== null && day_of_week !== "") {
      countQuery += ` AND day_of_week = $${countParamIdx++}`;
      countParams.push(parseInt(day_of_week));
    }

    if (status) {
      countQuery += ` AND status = $${countParamIdx++}`;
      countParams.push(status);
    }

    if (effective_from) {
      countQuery += ` AND (effective_to IS NULL OR effective_to >= $${countParamIdx++})`;
      countParams.push(effective_from);
    }

    if (effective_to) {
      countQuery += ` AND effective_from <= $${countParamIdx++}`;
      countParams.push(effective_to);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        totalPages,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    console.error("GET /api/slots error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/slots/:id — Get single slot ──────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT s.*,
              d.name AS doctor_name,
              d.speciality
       FROM slots_for_token_system s
       LEFT JOIN doctors d ON s.doctor_id = d.id
       WHERE s.id = $1 AND s.deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Slot not found",
      });
    }

    const slot = result.rows[0];

    // ── Verify clinic access ────────────────────────────────────────────────
    if (req.clinic_id !== slot.clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    res.json({
      success: true,
      data: slot,
    });
  } catch (err) {
    console.error("GET /api/slots/:id error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/slots/:id — Update slot ────────────────────────────────────
// Updatable fields: day_of_week, start_time, end_time, max_appointments_per_slot, status, effective_from, effective_to
// (clinic_id & doctor_id cannot be changed)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { day_of_week, start_time, end_time, max_appointments_per_slot, status, effective_from, effective_to } = req.body;

    // ── Get existing slot ────────────────────────────────────────────────────
    const existing = await pool.query(
      `SELECT * FROM slots_for_token_system WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Slot not found",
      });
    }

    const slot = existing.rows[0];

    // ── Verify clinic access ────────────────────────────────────────────────
    if (req.clinic_id !== slot.clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // ── Prepare update data ────────────────────────────────────────────────
    const updates = {};
    let updateIdx = 1;
    const params = [];

    if (day_of_week !== undefined) {
      if (!Number.isInteger(day_of_week) || day_of_week < 0 || day_of_week > 6) {
        return res.status(400).json({
          success: false,
          error: "day_of_week must be an integer between 0 (Sunday) and 6 (Saturday)",
        });
      }
      updates.day_of_week = `$${updateIdx++}`;
      params.push(day_of_week);
    }

    if (start_time !== undefined) {
      if (!isValidTimeFormat(start_time)) {
        return res.status(400).json({
          success: false,
          error: "start_time must be in HH:MM:SS format",
        });
      }
      updates.start_time = `$${updateIdx++}`;
      params.push(start_time);
    }

    if (end_time !== undefined) {
      if (!isValidTimeFormat(end_time)) {
        return res.status(400).json({
          success: false,
          error: "end_time must be in HH:MM:SS format",
        });
      }
      updates.end_time = `$${updateIdx++}`;
      params.push(end_time);
    }

    if (max_appointments_per_slot !== undefined) {
      if (max_appointments_per_slot <= 0 || !Number.isInteger(max_appointments_per_slot)) {
        return res.status(400).json({
          success: false,
          error: "max_appointments_per_slot must be a positive integer",
        });
      }
      updates.max_appointments_per_slot = `$${updateIdx++}`;
      params.push(max_appointments_per_slot);
    }

    if (status !== undefined) {
      const validStatuses = ["open", "full", "closed", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `status must be one of: ${validStatuses.join(", ")}`,
        });
      }
      updates.status = `$${updateIdx++}`;
      params.push(status);
    }

    if (effective_from !== undefined) {
      if (!isValidDateFormat(effective_from)) {
        return res.status(400).json({
          success: false,
          error: "effective_from must be in YYYY-MM-DD format",
        });
      }
      updates.effective_from = `$${updateIdx++}`;
      params.push(effective_from);
    }

    if (effective_to !== undefined) {
      if (effective_to && !isValidDateFormat(effective_to)) {
        return res.status(400).json({
          success: false,
          error: "effective_to must be in YYYY-MM-DD format",
        });
      }
      updates.effective_to = `$${updateIdx++}`;
      params.push(effective_to || null);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update",
      });
    }

    // ── Validate time logic if both are being updated ───────────────────────
    const finalStartTime = start_time || slot.start_time;
    const finalEndTime = end_time || slot.end_time;

    if (!isTimeAfter(finalEndTime, finalStartTime)) {
      return res.status(400).json({
        success: false,
        error: "end_time must be after start_time",
      });
    }

    // ── Validate date range if both dates are present ───────────────────────
    const finalEffectiveFrom = effective_from || slot.effective_from;
    const finalEffectiveTo = effective_to !== undefined ? effective_to : slot.effective_to;

    if (finalEffectiveFrom && finalEffectiveTo && new Date(finalEffectiveTo) < new Date(finalEffectiveFrom)) {
      return res.status(400).json({
        success: false,
        error: "effective_to must be after or equal to effective_from",
      });
    }

    // ── Build update query ──────────────────────────────────────────────────
    const updateFields = Object.entries(updates)
      .map(([key, placeholder]) => `${key} = ${placeholder}`)
      .join(", ");

    params.push(id);

    const result = await pool.query(
      `UPDATE slots_for_token_system
       SET ${updateFields}
       WHERE id = $${updateIdx}
       RETURNING *`,
      params
    );

    res.json({
      success: true,
      message: "Slot updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("PATCH /api/slots/:id error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/slots/:id — Soft delete slot ──────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ── Get existing slot ────────────────────────────────────────────────────
    const existing = await pool.query(
      `SELECT * FROM slots_for_token_system WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Slot not found",
      });
    }

    const slot = existing.rows[0];

    // ── Verify clinic access ────────────────────────────────────────────────
    if (req.clinic_id !== slot.clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // ── Soft delete ─────────────────────────────────────────────────────────
    const result = await pool.query(
      `UPDATE slots_for_token_system
       SET deleted_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json({
      success: true,
      message: "Slot deleted successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("DELETE /api/slots/:id error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
