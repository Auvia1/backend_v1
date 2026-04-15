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

// ─── POST /api/slots — Create a new slot ──────────────────────────────────────
// Required: doctor_id, slot_start, slot_end, max_appointments_per_slot, clinic_id
// Optional: status (default: 'open')
router.post("/", async (req, res) => {
  try {
    const {
      clinic_id,
      doctor_id,
      slot_start,
      slot_end,
      max_appointments_per_slot,
      status = "open",
    } = req.body;

    // ── Validate required fields ────────────────────────────────────────────
    if (!clinic_id || !doctor_id || !slot_start || !slot_end || !max_appointments_per_slot) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: clinic_id, doctor_id, slot_start, slot_end, max_appointments_per_slot",
      });
    }

    // ── Verify clinic_id matches authenticated user's clinic ────────────────
    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // ── Validate slot times ────────────────────────────────────────────────
    const startTime = new Date(slot_start);
    const endTime = new Date(slot_end);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format. Use ISO 8601 format (e.g., 2026-04-15T09:00:00Z)",
      });
    }

    if (endTime <= startTime) {
      return res.status(400).json({
        success: false,
        error: "slot_end must be after slot_start",
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
       (clinic_id, doctor_id, slot_start, slot_end, max_appointments_per_slot, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [clinic_id, doctor_id, slot_start, slot_end, max_appointments_per_slot, status]
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

// ─── GET /api/slots — List slots with filters ──────────────────────────────────
// Query params:
//   clinic_id (required)
//   doctor_id (optional)
//   status (optional): open, full, closed, cancelled
//   start_date (optional): ISO date to filter slots from
//   end_date (optional): ISO date to filter slots until
//   page (optional, default: 1)
//   limit (optional, default: 20)
router.get("/", async (req, res) => {
  try {
    const {
      clinic_id,
      doctor_id,
      status,
      start_date,
      end_date,
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
        s.slot_start,
        s.slot_end,
        s.max_appointments_per_slot,
        s.status,
        (SELECT COUNT(*) FROM appointments WHERE appointments.clinic_id = s.clinic_id
         AND appointments.doctor_id = s.doctor_id
         AND appointments.appointment_start >= s.slot_start
         AND appointments.appointment_end <= s.slot_end
         AND appointments.deleted_at IS NULL) AS appointments_count,
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

    // ── Filter by date range ────────────────────────────────────────────────
    if (start_date) {
      query += ` AND s.slot_start >= $${paramIdx++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND s.slot_end <= $${paramIdx++}`;
      params.push(end_date);
    }

    // ── Order by slot_start ────────────────────────────────────────────────
    query += ` ORDER BY s.slot_start ASC`;

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

    if (status) {
      countQuery += ` AND status = $${countParamIdx++}`;
      countParams.push(status);
    }

    if (start_date) {
      countQuery += ` AND slot_start >= $${countParamIdx++}`;
      countParams.push(start_date);
    }

    if (end_date) {
      countQuery += ` AND slot_end <= $${countParamIdx++}`;
      countParams.push(end_date);
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

// ─── GET /api/slots/:id — Get single slot ──────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT s.*,
              d.name AS doctor_name,
              d.speciality,
              (SELECT COUNT(*) FROM appointments
               WHERE clinic_id = s.clinic_id
               AND doctor_id = s.doctor_id
               AND appointment_start >= s.slot_start
               AND appointment_end <= s.slot_end
               AND deleted_at IS NULL) AS appointments_count
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

// ─── PATCH /api/slots/:id — Update slot ────────────────────────────────────────
// Updatable fields: slot_start, slot_end, max_appointments_per_slot, status (clinic_id & doctor_id cannot be changed)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { slot_start, slot_end, max_appointments_per_slot, status } = req.body;

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

    if (slot_start !== undefined) {
      const startTime = new Date(slot_start);
      if (isNaN(startTime.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid slot_start format",
        });
      }
      updates.slot_start = `$${updateIdx++}`;
      params.push(slot_start);
    }

    if (slot_end !== undefined) {
      const endTime = new Date(slot_end);
      if (isNaN(endTime.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid slot_end format",
        });
      }
      updates.slot_end = `$${updateIdx++}`;
      params.push(slot_end);
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

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update",
      });
    }

    // ── Validate time logic if both are being updated ───────────────────────
    const finalStartTime = slot_start || slot.slot_start;
    const finalEndTime = slot_end || slot.slot_end;

    if (new Date(finalEndTime) <= new Date(finalStartTime)) {
      return res.status(400).json({
        success: false,
        error: "slot_end must be after slot_start",
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

// ─── DELETE /api/slots/:id — Soft delete slot ──────────────────────────────────
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
