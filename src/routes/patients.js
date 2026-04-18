// server/src/routes/patients.js
const express = require("express");
const router = express.Router();
const pool = require("../../database/db");

// ─── GET /api/patients?clinic_id=&search=name_or_phone&limit=10 ───────────────
// Schema changes:
//   • patients are scoped to a clinic — clinic_id filter required
//   • appointments.appointment_date removed → use DATE(appointment_start AT TIME ZONE tz)
router.get("/", async (req, res) => {
  try {
    const { clinic_id, search, limit = 10 } = req.query;

    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id query param required" });
    }

    let query = `
      SELECT
        p.id,
        p.name,
        p.phone,
        p.email,
        p.gender,
        p.date_of_birth,
        p.created_at,
        COUNT(a.id)                                                               AS total_appointments,
        MAX(DATE(a.appointment_start AT TIME ZONE 'Asia/Kolkata'))                AS last_visit
      FROM patients p
      LEFT JOIN appointments a
             ON a.patient_id = p.id
            AND a.deleted_at IS NULL
      WHERE p.clinic_id = $1
        AND p.deleted_at IS NULL
    `;

    const params = [clinic_id];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (p.name ILIKE $${params.length} OR p.phone ILIKE $${params.length})`;
    }

    params.push(Number(limit));
    query += ` GROUP BY p.id ORDER BY p.name ASC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Patients fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/patients/:id?clinic_id= — single patient with appointment history
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { clinic_id } = req.query;

    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id query param required" });
    }

    const patientResult = await pool.query(
      `SELECT
         p.*,
         COUNT(a.id)                                                              AS total_appointments,
         MAX(DATE(a.appointment_start AT TIME ZONE 'Asia/Kolkata'))               AS last_visit
       FROM patients p
       LEFT JOIN appointments a
              ON a.patient_id = p.id
             AND a.deleted_at IS NULL
       WHERE p.id        = $1
         AND p.clinic_id = $2
         AND p.deleted_at IS NULL
       GROUP BY p.id`,
      [id, clinic_id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    // Appointment history — use appointment_start for ordering (no appointment_date col)
    const historyResult = await pool.query(
      `SELECT
         a.id,
         a.appointment_start,
         a.appointment_end,
         a.reason,
         a.notes,
         a.status,
         a.payment_status,
         a.payment_amount,
         a.source,
         d.name       AS doctor_name,
         d.speciality AS doctor_speciality
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.patient_id = $1
         AND a.clinic_id  = $2
         AND a.deleted_at IS NULL
       ORDER BY a.appointment_start DESC
       LIMIT 20`,
      [id, clinic_id]
    );

    res.json({
      success: true,
      data: {
        ...patientResult.rows[0],
        history: historyResult.rows,
      },
    });
  } catch (err) {
    console.error("Patient detail fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/patients/:id/appointments?clinic_id=&status=&start_date=&end_date=&page=&limit=
// Fetch all appointments for a specific patient
router.get("/:id/appointments", async (req, res) => {
  try {
    const { id } = req.params;
    const { clinic_id, status, start_date, end_date, page = 1, limit = 20 } = req.query;

    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id query param required" });
    }

    // Verify patient exists in this clinic
    const patientCheck = await pool.query(
      `SELECT id FROM patients WHERE id = $1 AND clinic_id = $2 AND deleted_at IS NULL`,
      [id, clinic_id]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    let query = `
      SELECT
        a.id,
        a.appointment_start,
        a.appointment_end,
        a.reason,
        a.notes,
        a.status,
        a.payment_status,
        a.payment_amount,
        a.source,
        a.token_number,
        a.created_at,
        d.id       AS doctor_id,
        d.name     AS doctor_name,
        d.speciality AS doctor_speciality,
        c.id       AS clinic_id,
        c.name     AS clinic_name,
        c.email    AS clinic_email,
        c.phone    AS clinic_phone
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN clinics c ON a.clinic_id = c.id
      WHERE a.patient_id = $1
        AND a.clinic_id = $2
        AND a.deleted_at IS NULL
    `;

    const params = [id, clinic_id];
    let paramCount = 3;

    if (status) {
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (start_date) {
      query += ` AND DATE(a.appointment_start AT TIME ZONE 'Asia/Kolkata') >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND DATE(a.appointment_start AT TIME ZONE 'Asia/Kolkata') <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    // Get total count
    const countQuery = query.replace(/SELECT.*?FROM/, "SELECT COUNT(*) as total FROM");
    const countResult = await pool.query(countQuery, params.slice(0, paramCount - (start_date ? 1 : 0) - (end_date ? 1 : 0) - (status ? 1 : 0)));
    const total = parseInt(countResult.rows[0].total);

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY a.appointment_start DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Patient appointments fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/patients/:id/clinics?page=&limit=
// Fetch all clinics a patient has visited
router.get("/:id/clinics", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Get all clinics where patient has appointments
    let query = `
      SELECT DISTINCT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.state,
        c.postal_code,
        c.clinic_type,
        c.subscription_plan,
        c.subscription_status,
        c.owner_name,
        COUNT(DISTINCT a.id) AS total_appointments,
        MIN(DATE(a.appointment_start AT TIME ZONE 'Asia/Kolkata')) AS first_visit,
        MAX(DATE(a.appointment_start AT TIME ZONE 'Asia/Kolkata')) AS last_visit
      FROM clinics c
      JOIN appointments a ON c.id = a.clinic_id
      WHERE a.patient_id = $1
        AND a.deleted_at IS NULL
        AND c.deleted_at IS NULL
      GROUP BY c.id
    `;

    const params = [id];

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM clinics c
      JOIN appointments a ON c.id = a.clinic_id
      WHERE a.patient_id = $1
        AND a.deleted_at IS NULL
        AND c.deleted_at IS NULL
    `;
    const countResult = await pool.query(countQuery, [id]);
    const total = parseInt(countResult.rows[0].total);

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY last_visit DESC LIMIT $2 OFFSET $3`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Patient clinics fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;