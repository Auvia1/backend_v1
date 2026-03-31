const express = require("express");
const router = express.Router();
const pool = require("../../database/db");

// ─── GET /api/doctors?clinic_id= — list all active doctors for a clinic ───────
router.get("/", async (req, res) => {
  try {
    const { clinic_id } = req.query;

    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id query param required" });
    }

    const result = await pool.query(
      `SELECT * FROM doctors
       WHERE clinic_id = $1
         AND is_active  = true
         AND deleted_at IS NULL
       ORDER BY name ASC`,
      [clinic_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/doctors — create new doctor ──────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { clinic_id, name, speciality, consultation_duration_minutes, buffer_time_minutes, max_appointments_per_day } = req.body;

    if (!clinic_id || !name) {
      return res.status(400).json({ success: false, error: "clinic_id and name are required" });
    }

    const result = await pool.query(
      `INSERT INTO doctors (clinic_id, name, speciality, consultation_duration_minutes, buffer_time_minutes, max_appointments_per_day)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [clinic_id, name, speciality || null, consultation_duration_minutes || 30, buffer_time_minutes || 0, max_appointments_per_day || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/doctors/:id — get single doctor ───────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM doctors WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Doctor not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/doctors/:id — update doctor ─────────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, speciality, consultation_duration_minutes, buffer_time_minutes, max_appointments_per_day, is_active } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) { updates.push(`name = $${paramCount++}`); values.push(name); }
    if (speciality !== undefined) { updates.push(`speciality = $${paramCount++}`); values.push(speciality); }
    if (consultation_duration_minutes !== undefined) { updates.push(`consultation_duration_minutes = $${paramCount++}`); values.push(consultation_duration_minutes); }
    if (buffer_time_minutes !== undefined) { updates.push(`buffer_time_minutes = $${paramCount++}`); values.push(buffer_time_minutes); }
    if (max_appointments_per_day !== undefined) { updates.push(`max_appointments_per_day = $${paramCount++}`); values.push(max_appointments_per_day); }
    if (is_active !== undefined) { updates.push(`is_active = $${paramCount++}`); values.push(is_active); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    values.push(id);
    const query = `UPDATE doctors SET ${updates.join(", ")} WHERE id = $${paramCount} AND deleted_at IS NULL RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Doctor not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/doctors/:id — soft delete doctor ──────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE doctors SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Doctor not found" });
    }

    res.json({ success: true, message: "Doctor deleted successfully", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// DOCTOR SCHEDULE APIs
// ═════════════════════════════════════════════════════════════════════════════

// ─── GET /api/doctors/:id/schedule — get all schedules for a doctor ─────────
router.get("/:id/schedule", async (req, res) => {
  try {
    const { id } = req.params;
    const { clinic_id } = req.query;

    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id query param required" });
    }

    const result = await pool.query(
      `SELECT * FROM doctor_schedule
       WHERE doctor_id = $1 AND clinic_id = $2
       ORDER BY day_of_week ASC`,
      [id, clinic_id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/doctors/:id/schedule — create schedule for doctor ────────────
router.post("/:id/schedule", async (req, res) => {
  try {
    const { id } = req.params;
    const { clinic_id, day_of_week, start_time, end_time, slot_duration_minutes, effective_from, effective_to } = req.body;

    if (!clinic_id || day_of_week === undefined || !start_time || !end_time || !slot_duration_minutes) {
      return res.status(400).json({ success: false, error: "clinic_id, day_of_week, start_time, end_time, and slot_duration_minutes are required" });
    }

    const result = await pool.query(
      `INSERT INTO doctor_schedule (clinic_id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, effective_from, effective_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [clinic_id, id, day_of_week, start_time, end_time, slot_duration_minutes, effective_from || null, effective_to || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/doctors/:id/schedule/:schedule_id — update schedule ────────
router.patch("/:id/schedule/:schedule_id", async (req, res) => {
  try {
    const { id, schedule_id } = req.params;
    const { day_of_week, start_time, end_time, slot_duration_minutes, effective_from, effective_to } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (day_of_week !== undefined) { updates.push(`day_of_week = $${paramCount++}`); values.push(day_of_week); }
    if (start_time !== undefined) { updates.push(`start_time = $${paramCount++}`); values.push(start_time); }
    if (end_time !== undefined) { updates.push(`end_time = $${paramCount++}`); values.push(end_time); }
    if (slot_duration_minutes !== undefined) { updates.push(`slot_duration_minutes = $${paramCount++}`); values.push(slot_duration_minutes); }
    if (effective_from !== undefined) { updates.push(`effective_from = $${paramCount++}`); values.push(effective_from); }
    if (effective_to !== undefined) { updates.push(`effective_to = $${paramCount++}`); values.push(effective_to); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    values.push(schedule_id);
    values.push(id);
    const query = `UPDATE doctor_schedule SET ${updates.join(", ")} WHERE id = $${paramCount++} AND doctor_id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Schedule not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/doctors/:id/schedule/:schedule_id — delete schedule ───────
router.delete("/:id/schedule/:schedule_id", async (req, res) => {
  try {
    const { id, schedule_id } = req.params;

    const result = await pool.query(
      `DELETE FROM doctor_schedule WHERE id = $1 AND doctor_id = $2 RETURNING *`,
      [schedule_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Schedule not found" });
    }

    res.json({ success: true, message: "Schedule deleted successfully", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// DOCTOR TIME OFF APIs
// ═════════════════════════════════════════════════════════════════════════════

// ─── GET /api/doctors/:id/time-off — get all time off for a doctor ─────────
router.get("/:id/time-off", async (req, res) => {
  try {
    const { id } = req.params;
    const { clinic_id } = req.query;

    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id query param required" });
    }

    const result = await pool.query(
      `SELECT * FROM doctor_time_off
       WHERE doctor_id = $1 AND clinic_id = $2
       ORDER BY start_time DESC`,
      [id, clinic_id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/doctors/:id/time-off — create time off for doctor ───────────
router.post("/:id/time-off", async (req, res) => {
  try {
    const { id } = req.params;
    const { clinic_id, start_time, end_time, reason } = req.body;

    if (!clinic_id || !start_time || !end_time) {
      return res.status(400).json({ success: false, error: "clinic_id, start_time, and end_time are required (ISO 8601 format)" });
    }

    const result = await pool.query(
      `INSERT INTO doctor_time_off (clinic_id, doctor_id, start_time, end_time, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [clinic_id, id, start_time, end_time, reason || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/doctors/:id/time-off/:timeoff_id — update time off ────────
router.patch("/:id/time-off/:timeoff_id", async (req, res) => {
  try {
    const { id, timeoff_id } = req.params;
    const { start_time, end_time, reason } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (start_time !== undefined) { updates.push(`start_time = $${paramCount++}`); values.push(start_time); }
    if (end_time !== undefined) { updates.push(`end_time = $${paramCount++}`); values.push(end_time); }
    if (reason !== undefined) { updates.push(`reason = $${paramCount++}`); values.push(reason); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    values.push(timeoff_id);
    values.push(id);
    const query = `UPDATE doctor_time_off SET ${updates.join(", ")} WHERE id = $${paramCount++} AND doctor_id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Time off not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/doctors/:id/time-off/:timeoff_id — delete time off ────────
router.delete("/:id/time-off/:timeoff_id", async (req, res) => {
  try {
    const { id, timeoff_id } = req.params;

    const result = await pool.query(
      `DELETE FROM doctor_time_off WHERE id = $1 AND doctor_id = $2 RETURNING *`,
      [timeoff_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Time off not found" });
    }

    res.json({ success: true, message: "Time off deleted successfully", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// DOCTOR APPOINTMENTS
// ═════════════════════════════════════════════════════════════════════════════

// ─── GET /api/doctors/:id/appointments — fetch all appointments for a doctor ─
// Query params:
//   clinic_id (required) — the clinic context
//   status (optional) — filter by status: pending, confirmed, completed, cancelled, no_show, rescheduled
//   start_date (optional) — ISO date YYYY-MM-DD to filter from
//   end_date (optional) — ISO date YYYY-MM-DD to filter until
//   patient_id (optional) — filter by specific patient
//   page (optional) — pagination (default: 1)
//   limit (optional) — items per page (default: 20)
router.get("/:id/appointments", async (req, res) => {
  try {
    const { id } = req.params;
    const { clinic_id, status, start_date, end_date, patient_id, page = 1, limit = 20 } = req.query;

    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id query param required" });
    }

    // ── Build dynamic query ────────────────────────────────────────────────────
    let query = `
      SELECT
        a.id,
        a.clinic_id,
        a.patient_id,
        a.doctor_id,
        a.appointment_start,
        a.appointment_end,
        a.reason,
        a.notes,
        a.status,
        a.source,
        a.payment_status,
        a.payment_amount,
        a.created_at,
        a.updated_at,
        pt.name AS patient_name,
        pt.phone AS patient_phone,
        pt.email AS patient_email,
        d.name AS doctor_name,
        d.speciality
      FROM appointments a
      JOIN patients pt ON a.patient_id = pt.id
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.doctor_id = $1
        AND a.clinic_id = $2
        AND a.deleted_at IS NULL
    `;

    const params = [id, clinic_id];
    let paramIdx = 3;

    // Filter by status if provided
    if (status) {
      const allowed = ["pending", "confirmed", "completed", "cancelled", "no_show", "rescheduled"];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Allowed: ${allowed.join(", ")}`,
        });
      }
      query += ` AND a.status = $${paramIdx++}`;
      params.push(status);
    }

    // Filter by date range if provided
    if (start_date) {
      query += ` AND DATE(a.appointment_start AT TIME ZONE 'Asia/Kolkata') >= $${paramIdx++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(a.appointment_start AT TIME ZONE 'Asia/Kolkata') <= $${paramIdx++}`;
      params.push(end_date);
    }

    // Filter by patient if provided
    if (patient_id) {
      query += ` AND a.patient_id = $${paramIdx++}`;
      params.push(patient_id);
    }

    // Order by appointment_start descending (most recent first)
    query += ` ORDER BY a.appointment_start DESC`;

    // ── Calculate pagination ────────────────────────────────────────────────────
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), offset);

    // ── Execute query ──────────────────────────────────────────────────────────
    const result = await pool.query(query, params);

    // ── Get total count for pagination ──────────────────────────────────────────
    let countQuery = `
      SELECT COUNT(*) FROM appointments a
      WHERE a.doctor_id = $1
        AND a.clinic_id = $2
        AND a.deleted_at IS NULL
    `;
    const countParams = [id, clinic_id];
    let countParamIdx = 3;

    if (status) {
      countQuery += ` AND a.status = $${countParamIdx++}`;
      countParams.push(status);
    }

    if (start_date) {
      countQuery += ` AND DATE(a.appointment_start AT TIME ZONE 'Asia/Kolkata') >= $${countParamIdx++}`;
      countParams.push(start_date);
    }

    if (end_date) {
      countQuery += ` AND DATE(a.appointment_start AT TIME ZONE 'Asia/Kolkata') <= $${countParamIdx++}`;
      countParams.push(end_date);
    }

    if (patient_id) {
      countQuery += ` AND a.patient_id = $${countParamIdx++}`;
      countParams.push(patient_id);
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
    console.error("Doctor appointments fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/doctors/:id/slots?date=YYYY-MM-DD&clinic_id= ───────────────────
// Schema changes:
//   • doctor_time_off uses TIMESTAMPTZ ranges — no separate `date` column
//   • appointments uses appointment_start TIMESTAMPTZ — no appointment_date + start_time cols
//   • doctor_schedule.effective_from / effective_to now respected
router.get("/:id/slots", async (req, res) => {
  try {
    const { id } = req.params;
    const { date, clinic_id } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, error: "date query param required" });
    }
    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id query param required" });
    }

    // new Date(date) parses YYYY-MM-DD as UTC midnight; getUTCDay() avoids DST shift
    const dayOfWeek = new Date(date).getUTCDay(); // 0=Sun, 6=Sat

    // Get doctor schedule for this weekday, honouring effective date window
    const scheduleResult = await pool.query(
      `SELECT * FROM doctor_schedule
       WHERE doctor_id   = $1
         AND clinic_id   = $2
         AND day_of_week = $3
         AND effective_from <= $4::date
         AND (effective_to IS NULL OR effective_to >= $4::date)
       LIMIT 1`,
      [id, clinic_id, dayOfWeek, date]
    );

    if (scheduleResult.rows.length === 0) {
      return res.json({ success: true, data: [], message: "Doctor does not work this day" });
    }

    const schedule = scheduleResult.rows[0];
    const slotDuration = schedule.slot_duration_minutes;

    // ── Booked slots ─────────────────────────────────────────────────────────
    // appointment_start is TIMESTAMPTZ; extract the HH:MM:SS in IST for comparison
    const bookedResult = await pool.query(
      `SELECT TO_CHAR(appointment_start AT TIME ZONE 'Asia/Kolkata', 'HH24:MI:SS') AS start_time
       FROM appointments
       WHERE doctor_id  = $1
         AND clinic_id  = $2
         AND deleted_at IS NULL
         AND status NOT IN ('cancelled', 'rescheduled')
         AND DATE(appointment_start AT TIME ZONE 'Asia/Kolkata') = $3::date`,
      [id, clinic_id, date]
    );
    const bookedTimes = new Set(bookedResult.rows.map((r) => r.start_time));

    // ── Doctor time-off for this date ─────────────────────────────────────────
    // doctor_time_off has no `date` column — filter by TIMESTAMPTZ overlap with the target day
    const dayStart = `${date}T00:00:00+05:30`;
    const dayEnd   = `${date}T23:59:59+05:30`;

    const timeOffResult = await pool.query(
      `SELECT
         TO_CHAR(start_time AT TIME ZONE 'Asia/Kolkata', 'HH24:MI:SS') AS off_start,
         TO_CHAR(end_time   AT TIME ZONE 'Asia/Kolkata', 'HH24:MI:SS') AS off_end
       FROM doctor_time_off
       WHERE doctor_id  = $1
         AND clinic_id  = $2
         AND start_time < $4::timestamptz
         AND end_time   > $3::timestamptz`,
      [id, clinic_id, dayStart, dayEnd]
    );

    // ── Generate slots ────────────────────────────────────────────────────────
    const slots = [];
    const [startH, startM] = schedule.start_time.split(":").map(Number);
    const [endH,   endM  ] = schedule.end_time.split(":").map(Number);
    let current    = startH * 60 + startM;
    const endMins  = endH   * 60 + endM;

    while (current + slotDuration <= endMins) {
      const hh      = String(Math.floor(current / 60)).padStart(2, "0");
      const mm      = String(current % 60).padStart(2, "0");
      const timeStr = `${hh}:${mm}:00`;

      const isBooked   = bookedTimes.has(timeStr);
      const isOnLeave  = timeOffResult.rows.some(
        (to) => timeStr >= to.off_start && timeStr < to.off_end
      );

      slots.push({ time: timeStr, available: !isBooked && !isOnLeave });
      current += slotDuration;
    }

    res.json({ success: true, data: slots });
  } catch (err) {
    console.error("Slots fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;