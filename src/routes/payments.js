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

// ─── GET /api/payments — fetch payments for clinic ────────────────────────
// Query params:
//   clinic_id (required) — the clinic to fetch payments for
//   status (optional) — filter by status: pending, paid, failed, refunded
//   start_date (optional) — ISO date YYYY-MM-DD to filter from
//   end_date (optional) — ISO date YYYY-MM-DD to filter until
//   page (optional) — pagination (default: 1)
//   limit (optional) — items per page (default: 20)
router.get("/", async (req, res) => {
  try {
    const { clinic_id, status, start_date, end_date, page = 1, limit = 20 } = req.query;

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
        p.id,
        p.clinic_id,
        p.appointment_id,
        p.amount,
        p.currency,
        p.status,
        p.provider,
        p.provider_payment_id,
        p.created_at,
        a.appointment_start,
        a.appointment_end,
        pt.name AS patient_name,
        pt.phone AS patient_phone,
        d.name AS doctor_name,
        d.speciality
      FROM payments p
      JOIN appointments a ON p.appointment_id = a.id
      JOIN patients pt ON a.patient_id = pt.id
      JOIN doctors d ON a.doctor_id = d.id
      WHERE p.clinic_id = $1
    `;

    const params = [clinic_id];
    let paramIdx = 2;

    // Filter by status if provided
    if (status) {
      const allowed = ["pending", "paid", "failed", "refunded"];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Allowed: ${allowed.join(", ")}`,
        });
      }
      query += ` AND p.status = $${paramIdx++}`;
      params.push(status);
    }

    // Filter by date range if provided
    if (start_date) {
      query += ` AND DATE(p.created_at) >= $${paramIdx++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(p.created_at) <= $${paramIdx++}`;
      params.push(end_date);
    }

    // Order by created_at descending (most recent first)
    query += ` ORDER BY p.created_at DESC`;

    // ── Calculate pagination ────────────────────────────────────────────────────
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), offset);

    // ── Execute query ──────────────────────────────────────────────────────────
    const result = await pool.query(query, params);

    // ── Get total count for pagination ──────────────────────────────────────────
    let countQuery = `SELECT COUNT(*) FROM payments WHERE clinic_id = $1`;
    const countParams = [clinic_id];
    let countParamIdx = 2;

    if (status) {
      countQuery += ` AND status = $${countParamIdx++}`;
      countParams.push(status);
    }

    if (start_date) {
      countQuery += ` AND DATE(created_at) >= $${countParamIdx++}`;
      countParams.push(start_date);
    }

    if (end_date) {
      countQuery += ` AND DATE(created_at) <= $${countParamIdx++}`;
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
    console.error("Payments fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/payments/:id — fetch single payment ──────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         p.id,
         p.clinic_id,
         p.appointment_id,
         p.amount,
         p.currency,
         p.status,
         p.provider,
         p.provider_payment_id,
         p.created_at,
         a.appointment_start,
         a.appointment_end,
         pt.name AS patient_name,
         pt.phone AS patient_phone,
         d.name AS doctor_name,
         d.speciality
       FROM payments p
       JOIN appointments a ON p.appointment_id = a.id
       JOIN patients pt ON a.patient_id = pt.id
       JOIN doctors d ON a.doctor_id = d.id
       WHERE p.id = $1
         AND p.clinic_id = $2`,
      [id, req.clinic_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Payment not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Payment fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/payments — create payment record ────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { appointment_id, amount, currency = "INR", status = "pending", provider, provider_payment_id } = req.body;

    if (!appointment_id || !amount) {
      return res.status(400).json({
        success: false,
        error: "appointment_id and amount are required",
      });
    }

    // ── Fetch appointment to get clinic_id ──────────────────────────────────────
    const apptResult = await pool.query(
      `SELECT clinic_id FROM appointments WHERE id = $1`,
      [appointment_id]
    );

    if (apptResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Appointment not found" });
    }

    const clinic_id = apptResult.rows[0].clinic_id;

    // ── Verify clinic_id matches authenticated user's clinic ────────────────────
    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // ── Insert payment ──────────────────────────────────────────────────────────
    const result = await pool.query(
      `INSERT INTO payments (clinic_id, appointment_id, amount, currency, status, provider, provider_payment_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, clinic_id, appointment_id, amount, currency, status, provider, provider_payment_id, created_at`,
      [clinic_id, appointment_id, amount, currency, status, provider || null, provider_payment_id || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Payment creation error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
