const express = require("express");
const router = express.Router();
const pool = require("../../database/db");

// ─── Helper: Get week boundaries (Sunday to Saturday) ──────────────────────
function getWeekBoundaries(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day; // Adjust to get Sunday

  const sunday = new Date(d.setDate(diff));
  const saturday = new Date(d.setDate(diff + 6));

  // Reset time to start of day
  sunday.setHours(0, 0, 0, 0);
  saturday.setHours(23, 59, 59, 999);

  return { sunday, saturday };
}

// ─── GET /api/analytics/earnings/week ─────────────────────────────────────
// Total earning of the current week (sum of all payments)
router.get("/earnings/week", async (req, res) => {
  try {
    const clinic_id = req.clinic_id;
    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id required in auth" });
    }

    const { sunday, saturday } = getWeekBoundaries();

    const result = await pool.query(
      `SELECT
         COALESCE(SUM(amount), 0) as total_earning,
         COUNT(*) as total_payments,
         COALESCE(AVG(amount), 0) as average_payment
       FROM payments
       WHERE clinic_id = $1
         AND status = 'paid'
         AND created_at >= $2
         AND created_at <= $3`,
      [clinic_id, sunday, saturday]
    );

    const data = result.rows[0];

    res.json({
      success: true,
      data: {
        total_earning: parseFloat(data.total_earning) || 0,
        total_payments: parseInt(data.total_payments) || 0,
        average_payment: parseFloat(data.average_payment) || 0,
        period: {
          start: sunday.toISOString().split("T")[0],
          end: saturday.toISOString().split("T")[0]
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/analytics/earnings/average ──────────────────────────────────
// Average earnings across all completed payments
router.get("/earnings/average", async (req, res) => {
  try {
    const clinic_id = req.clinic_id;
    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id required in auth" });
    }

    // Query can include optional date range
    const { start_date, end_date } = req.query;
    let query = `SELECT
                   COALESCE(AVG(amount), 0) as average_earning,
                   COALESCE(SUM(amount), 0) as total_earning,
                   COUNT(*) as total_payments,
                   MIN(amount) as min_payment,
                   MAX(amount) as max_payment
                 FROM payments
                 WHERE clinic_id = $1 AND status = 'paid'`;

    const params = [clinic_id];
    let paramCount = 2;

    if (start_date) {
      query += ` AND created_at >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND created_at <= $${paramCount++}`;
      params.push(end_date);
    }

    const result = await pool.query(query, params);
    const data = result.rows[0];

    res.json({
      success: true,
      data: {
        average_earning: parseFloat(data.average_earning) || 0,
        total_earning: parseFloat(data.total_earning) || 0,
        total_payments: parseInt(data.total_payments) || 0,
        min_payment: parseFloat(data.min_payment) || 0,
        max_payment: parseFloat(data.max_payment) || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/analytics/payments/monthly ──────────────────────────────────
// Fetch all payments in the current month with optional filters
router.get("/payments/monthly", async (req, res) => {
  try {
    const clinic_id = req.clinic_id;
    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id required in auth" });
    }

    // Get current month boundaries
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    lastDay.setHours(23, 59, 59, 999);

    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        p.id,
        p.amount,
        p.currency,
        p.status,
        p.provider,
        p.provider_payment_id,
        p.created_at,
        a.id as appointment_id,
        a.appointment_start,
        a.appointment_end,
        pt.id as patient_id,
        pt.name as patient_name,
        d.id as doctor_id,
        d.name as doctor_name
      FROM payments p
      LEFT JOIN appointments a ON p.appointment_id = a.id
      LEFT JOIN patients pt ON a.patient_id = pt.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      WHERE p.clinic_id = $1
        AND p.created_at >= $2
        AND p.created_at <= $3
    `;

    const params = [clinic_id, firstDay, lastDay];
    let paramCount = 4;

    if (status) {
      query += ` AND p.status = $${paramCount++}`;
      params.push(status);
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT.*?FROM/,
      "SELECT COUNT(*) as total FROM"
    );
    const countRes = await pool.query(countQuery, params);
    const totalPayments = parseInt(countRes.rows[0].total);

    // Get paginated results
    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const payments = result.rows.map(row => ({
      payment_id: row.id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      provider: row.provider,
      provider_payment_id: row.provider_payment_id,
      created_at: row.created_at,
      appointment: {
        appointment_id: row.appointment_id,
        appointment_start: row.appointment_start,
        appointment_end: row.appointment_end
      },
      patient: {
        patient_id: row.patient_id,
        patient_name: row.patient_name
      },
      doctor: {
        doctor_id: row.doctor_id,
        doctor_name: row.doctor_name
      }
    }));

    res.json({
      success: true,
      data: {
        payments: payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalPayments,
          pages: Math.ceil(totalPayments / limit)
        },
        period: {
          start: firstDay.toISOString().split("T")[0],
          end: lastDay.toISOString().split("T")[0]
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/analytics/earnings/doctor ────────────────────────────────────
// Doctor earnings: calculated from price_charged and appointment count in the week
// Query params: doctor_name OR doctor_id
router.get("/earnings/doctor", async (req, res) => {
  try {
    const clinic_id = req.clinic_id;
    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id required in auth" });
    }

    const { doctor_name, doctor_id } = req.query;

    if (!doctor_name && !doctor_id) {
      return res.status(400).json({
        success: false,
        error: "Either doctor_name or doctor_id query param is required"
      });
    }

    const { sunday, saturday } = getWeekBoundaries();
    let query = `
      SELECT
        d.id,
        d.name,
        d.speciality,
        d.price_charged,
        COUNT(a.id) as total_appointments,
        COALESCE(SUM(a.payment_amount), 0) as total_payment_amount,
        COUNT(a.id) FILTER (WHERE a.status = 'completed') as completed_appointments,
        COUNT(a.id) FILTER (WHERE a.status = 'pending') as pending_appointments,
        COUNT(a.id) FILTER (WHERE a.status = 'cancelled') as cancelled_appointments,
        (COUNT(a.id) FILTER (WHERE a.status = 'completed') * d.price_charged) as calculated_earning
      FROM doctors d
      LEFT JOIN appointments a ON d.id = a.doctor_id
        AND a.clinic_id = $1
        AND a.deleted_at IS NULL
        AND a.appointment_start >= $2
        AND a.appointment_start <= $3
      WHERE d.clinic_id = $1 AND d.deleted_at IS NULL
    `;

    const params = [clinic_id, sunday, saturday];
    let paramCount = 4;

    if (doctor_name) {
      query += ` AND d.name ILIKE $${paramCount}`;
      params.push(`%${doctor_name}%`);
    }

    if (doctor_id) {
      query += ` AND d.id = $${paramCount}`;
      params.push(doctor_id);
    }

    query += ` GROUP BY d.id, d.name, d.speciality, d.price_charged`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Doctor not found"
      });
    }

    const doctors = result.rows.map(row => ({
      doctor_id: row.id,
      doctor_name: row.name,
      speciality: row.speciality,
      price_charged: parseFloat(row.price_charged) || 0,
      total_appointments: parseInt(row.total_appointments) || 0,
      completed_appointments: parseInt(row.completed_appointments) || 0,
      pending_appointments: parseInt(row.pending_appointments) || 0,
      cancelled_appointments: parseInt(row.cancelled_appointments) || 0,
      total_payment_amount: parseFloat(row.total_payment_amount) || 0,
      calculated_earning: parseFloat(row.calculated_earning) || 0
    }));

    res.json({
      success: true,
      data: {
        doctors: doctors,
        period: {
          start: sunday.toISOString().split("T")[0],
          end: saturday.toISOString().split("T")[0]
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/analytics/appointments/total ────────────────────────────────
// Total number of appointments (with optional filters)
router.get("/appointments/total", async (req, res) => {
  try {
    const clinic_id = req.clinic_id;
    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id required in auth" });
    }

    const { start_date, end_date, status, doctor_id } = req.query;

    let query = `
      SELECT
        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_show,
        COUNT(*) FILTER (WHERE status = 'rescheduled') as rescheduled,
        COALESCE(SUM(payment_amount), 0) as total_payment_amount
      FROM appointments
      WHERE clinic_id = $1 AND deleted_at IS NULL
    `;

    const params = [clinic_id];
    let paramCount = 2;

    if (start_date) {
      query += ` AND appointment_start >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND appointment_start <= $${paramCount++}`;
      params.push(end_date);
    }

    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    }

    if (doctor_id) {
      query += ` AND doctor_id = $${paramCount++}`;
      params.push(doctor_id);
    }

    const result = await pool.query(query, params);
    const data = result.rows[0];

    res.json({
      success: true,
      data: {
        total_appointments: parseInt(data.total_appointments) || 0,
        breakdown: {
          pending: parseInt(data.pending) || 0,
          confirmed: parseInt(data.confirmed) || 0,
          completed: parseInt(data.completed) || 0,
          cancelled: parseInt(data.cancelled) || 0,
          no_show: parseInt(data.no_show) || 0,
          rescheduled: parseInt(data.rescheduled) || 0
        },
        total_payment_amount: parseFloat(data.total_payment_amount) || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/analytics/dashboard ─────────────────────────────────────────
// Combined dashboard summary (all metrics at once)
router.get("/dashboard", async (req, res) => {
  try {
    const clinic_id = req.clinic_id;
    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id required in auth" });
    }

    const { sunday, saturday } = getWeekBoundaries();

    // Get week earnings
    const weekEarningsRes = await pool.query(
      `SELECT
         COALESCE(SUM(amount), 0) as total_earning
       FROM payments
       WHERE clinic_id = $1 AND status = 'paid'
         AND created_at >= $2 AND created_at <= $3`,
      [clinic_id, sunday, saturday]
    );

    // Get total appointments
    const appointmentsRes = await pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'pending') as pending
       FROM appointments
       WHERE clinic_id = $1 AND deleted_at IS NULL
         AND appointment_start >= $2 AND appointment_start <= $3`,
      [clinic_id, sunday, saturday]
    );

    // Get average earnings
    const avgEarningsRes = await pool.query(
      `SELECT COALESCE(AVG(amount), 0) as average FROM payments
       WHERE clinic_id = $1 AND status = 'paid'`,
      [clinic_id]
    );

    // Get top doctors by earned
    const topDoctorsRes = await pool.query(
      `SELECT
         d.id, d.name,
         COUNT(a.id) as appointments,
         COALESCE(SUM(CASE WHEN a.status = 'completed' THEN d.price_charged ELSE 0 END), 0) as earned
       FROM doctors d
       LEFT JOIN appointments a ON d.id = a.doctor_id
         AND a.clinic_id = $1 AND a.deleted_at IS NULL
         AND a.appointment_start >= $2 AND a.appointment_start <= $3
       WHERE d.clinic_id = $1 AND d.deleted_at IS NULL
       GROUP BY d.id, d.name
       ORDER BY earned DESC
       LIMIT 5`,
      [clinic_id, sunday, saturday]
    );

    const weekEarnings = parseFloat(weekEarningsRes.rows[0].total_earning) || 0;
    const appointmentsData = appointmentsRes.rows[0];
    const avgEarning = parseFloat(avgEarningsRes.rows[0].average) || 0;

    res.json({
      success: true,
      data: {
        week_earnings: weekEarnings,
        week_period: {
          start: sunday.toISOString().split("T")[0],
          end: saturday.toISOString().split("T")[0]
        },
        appointments_this_week: {
          total: parseInt(appointmentsData.total) || 0,
          completed: parseInt(appointmentsData.completed) || 0,
          pending: parseInt(appointmentsData.pending) || 0
        },
        average_earning: avgEarning,
        top_doctors: topDoctorsRes.rows.map(row => ({
          doctor_id: row.id,
          doctor_name: row.name,
          appointments: parseInt(row.appointments) || 0,
          earned: parseFloat(row.earned) || 0
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
