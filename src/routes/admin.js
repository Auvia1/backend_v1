const express = require("express");
const router  = express.Router();
const pool    = require("../../database/db");
const { authenticateAdminToken } = require("../middleware");

// All admin routes require admin authentication
router.use(authenticateAdminToken);

// ═══════════════════════════════════════════════════════════════════════════
// CALL TRACKING
// ═══════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/calls/stats ─────────────────────────────────────────────
// Must be registered BEFORE /calls/:call_id to avoid param matching
router.get("/calls/stats", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT
        COUNT(*)                                      AS total_calls,
        COALESCE(SUM(credits_used), 0)                AS total_credits_consumed,
        ROUND(COALESCE(AVG(credits_used), 0)::numeric, 2) AS avg_credits_per_call,
        ROUND(COALESCE(AVG(duration), 0)::numeric, 2)     AS avg_duration,
        COALESCE(SUM(duration), 0)                    AS total_duration
      FROM calls
      WHERE 1=1
    `;
    const params  = [];
    let paramIdx  = 1;

    if (start_date) {
      query += ` AND DATE(time) >= $${paramIdx++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND DATE(time) <= $${paramIdx++}`;
      params.push(end_date);
    }

    const result = await pool.query(query, params);

    // Breakdown by clinic
    let clinicQuery = `
      SELECT
        c.id   AS clinic_id,
        c.name AS clinic_name,
        COUNT(cl.id)                        AS total_calls,
        COALESCE(SUM(cl.credits_used), 0)   AS total_credits_consumed,
        COALESCE(SUM(cl.duration), 0)       AS total_duration
      FROM calls cl
      JOIN clinics c ON cl.clinic_id = c.id
      WHERE 1=1
    `;
    const clinicParams = [];
    let clinicParamIdx = 1;

    if (start_date) {
      clinicQuery += ` AND DATE(cl.time) >= $${clinicParamIdx++}`;
      clinicParams.push(start_date);
    }
    if (end_date) {
      clinicQuery += ` AND DATE(cl.time) <= $${clinicParamIdx++}`;
      clinicParams.push(end_date);
    }

    clinicQuery += ` GROUP BY c.id, c.name ORDER BY total_credits_consumed DESC`;

    const clinicResult = await pool.query(clinicQuery, clinicParams);

    res.json({
      success: true,
      data: {
        summary: {
          total_calls:            parseInt(result.rows[0].total_calls),
          total_credits_consumed: parseFloat(result.rows[0].total_credits_consumed),
          avg_credits_per_call:   parseFloat(result.rows[0].avg_credits_per_call),
          avg_duration:           parseFloat(result.rows[0].avg_duration),
          total_duration:         parseFloat(result.rows[0].total_duration),
        },
        breakdown_by_clinic: clinicResult.rows.map(row => ({
          clinic_id:              row.clinic_id,
          clinic_name:            row.clinic_name,
          total_calls:            parseInt(row.total_calls),
          total_credits_consumed: parseFloat(row.total_credits_consumed),
          total_duration:         parseFloat(row.total_duration),
        })),
      },
    });
  } catch (err) {
    console.error("Admin calls stats error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/admin/calls ───────────────────────────────────────────────────
// All calls across all clinics with filters
router.get("/calls", async (req, res) => {
  try {
    const { clinic_id, agent_type, start_date, end_date, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT
        cl.id, cl.clinic_id, cl.time, cl.type, cl.caller, cl.agent_type,
        cl.duration, cl.credits_used, cl.ai_summary, cl.recording,
        cl.created_at, cl.updated_at,
        c.name AS clinic_name
      FROM calls cl
      JOIN clinics c ON cl.clinic_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (clinic_id) {
      query += ` AND cl.clinic_id = $${paramIdx++}`;
      params.push(clinic_id);
    }
    if (agent_type) {
      query += ` AND cl.agent_type = $${paramIdx++}`;
      params.push(agent_type);
    }
    if (start_date) {
      query += ` AND DATE(cl.time) >= $${paramIdx++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND DATE(cl.time) <= $${paramIdx++}`;
      params.push(end_date);
    }

    // Count
    const countQuery  = query.replace(/SELECT.*?FROM/, "SELECT COUNT(*) FROM");
    const countResult = await pool.query(countQuery, params);
    const totalCount  = parseInt(countResult.rows[0].count);

    // Paginated results
    query += ` ORDER BY cl.time DESC`;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page:       parseInt(page),
        limit:      parseInt(limit),
        total:      totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Admin calls fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/admin/calls/:call_id ──────────────────────────────────────────
// Single call detail with recording URL and credit consumption
router.get("/calls/:call_id", async (req, res) => {
  try {
    const { call_id } = req.params;

    const result = await pool.query(
      `SELECT
         cl.id, cl.clinic_id, cl.time, cl.type, cl.caller, cl.agent_type,
         cl.duration, cl.credits_used, cl.ai_summary, cl.recording,
         cl.created_at, cl.updated_at,
         c.name AS clinic_name
       FROM calls cl
       JOIN clinics c ON cl.clinic_id = c.id
       WHERE cl.id = $1`,
      [call_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Call not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Admin call detail error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT TRACKING
// ═══════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/payments/stats ──────────────────────────────────────────
// Must be registered BEFORE /payments/:payment_id
router.get("/payments/stats", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT
        COUNT(*)                                                AS total_payments,
        COUNT(*) FILTER (WHERE status = 'success')             AS successful_payments,
        COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0)            AS total_revenue,
        COALESCE(SUM(credits_purchased) FILTER (WHERE status = 'success'), 0) AS total_credits_sold
      FROM credit_payments
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (start_date) {
      query += ` AND DATE(created_at) >= $${paramIdx++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND DATE(created_at) <= $${paramIdx++}`;
      params.push(end_date);
    }

    const result = await pool.query(query, params);

    // Breakdown by clinic
    let clinicQuery = `
      SELECT
        c.id   AS clinic_id,
        c.name AS clinic_name,
        COUNT(cp.id)                          AS total_payments,
        COALESCE(SUM(cp.amount), 0)           AS total_revenue,
        COALESCE(SUM(cp.credits_purchased), 0) AS total_credits_sold
      FROM credit_payments cp
      JOIN clinics c ON cp.clinic_id = c.id
      WHERE cp.status = 'success'
    `;
    const clinicParams = [];
    let clinicParamIdx = 1;

    if (start_date) {
      clinicQuery += ` AND DATE(cp.created_at) >= $${clinicParamIdx++}`;
      clinicParams.push(start_date);
    }
    if (end_date) {
      clinicQuery += ` AND DATE(cp.created_at) <= $${clinicParamIdx++}`;
      clinicParams.push(end_date);
    }

    clinicQuery += ` GROUP BY c.id, c.name ORDER BY total_revenue DESC`;

    const clinicResult = await pool.query(clinicQuery, clinicParams);

    res.json({
      success: true,
      data: {
        summary: {
          total_payments:      parseInt(result.rows[0].total_payments),
          successful_payments: parseInt(result.rows[0].successful_payments),
          total_revenue:       parseFloat(result.rows[0].total_revenue),
          total_credits_sold:  parseFloat(result.rows[0].total_credits_sold),
        },
        breakdown_by_clinic: clinicResult.rows.map(row => ({
          clinic_id:          row.clinic_id,
          clinic_name:        row.clinic_name,
          total_payments:     parseInt(row.total_payments),
          total_revenue:      parseFloat(row.total_revenue),
          total_credits_sold: parseFloat(row.total_credits_sold),
        })),
      },
    });
  } catch (err) {
    console.error("Admin payments stats error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/admin/payments ────────────────────────────────────────────────
// All credit_payments records across all clinics
router.get("/payments", async (req, res) => {
  try {
    const { clinic_id, status, start_date, end_date, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT
        cp.id, cp.clinic_id, cp.razorpay_order_id, cp.razorpay_payment_id,
        cp.amount, cp.currency, cp.credits_purchased, cp.status,
        cp.created_at, cp.updated_at,
        c.name AS clinic_name
      FROM credit_payments cp
      JOIN clinics c ON cp.clinic_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (clinic_id) {
      query += ` AND cp.clinic_id = $${paramIdx++}`;
      params.push(clinic_id);
    }
    if (status) {
      query += ` AND cp.status = $${paramIdx++}`;
      params.push(status);
    }
    if (start_date) {
      query += ` AND DATE(cp.created_at) >= $${paramIdx++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND DATE(cp.created_at) <= $${paramIdx++}`;
      params.push(end_date);
    }

    // Count
    const countQuery  = query.replace(/SELECT.*?FROM/, "SELECT COUNT(*) FROM");
    const countResult = await pool.query(countQuery, params);
    const totalCount  = parseInt(countResult.rows[0].count);

    // Paginated results
    query += ` ORDER BY cp.created_at DESC`;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page:       parseInt(page),
        limit:      parseInt(limit),
        total:      totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Admin payments fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/admin/payments/:payment_id ────────────────────────────────────
// Single payment detail
router.get("/payments/:payment_id", async (req, res) => {
  try {
    const { payment_id } = req.params;

    const result = await pool.query(
      `SELECT
         cp.id, cp.clinic_id, cp.razorpay_order_id, cp.razorpay_payment_id,
         cp.razorpay_signature, cp.amount, cp.currency, cp.credits_purchased,
         cp.status, cp.created_at, cp.updated_at,
         c.name AS clinic_name
       FROM credit_payments cp
       JOIN clinics c ON cp.clinic_id = c.id
       WHERE cp.id = $1`,
      [payment_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Payment not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Admin payment detail error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO RECORDINGS
// ═══════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/recordings ──────────────────────────────────────────────
// List all calls that have recordings
router.get("/recordings", async (req, res) => {
  try {
    const { clinic_id, start_date, end_date, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT
        cl.id, cl.clinic_id, cl.time, cl.type, cl.caller, cl.agent_type,
        cl.duration, cl.credits_used, cl.recording, cl.created_at,
        c.name AS clinic_name
      FROM calls cl
      JOIN clinics c ON cl.clinic_id = c.id
      WHERE cl.recording IS NOT NULL AND cl.recording != ''
    `;
    const params = [];
    let paramIdx = 1;

    if (clinic_id) {
      query += ` AND cl.clinic_id = $${paramIdx++}`;
      params.push(clinic_id);
    }
    if (start_date) {
      query += ` AND DATE(cl.time) >= $${paramIdx++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND DATE(cl.time) <= $${paramIdx++}`;
      params.push(end_date);
    }

    // Count
    const countQuery  = query.replace(/SELECT.*?FROM/, "SELECT COUNT(*) FROM");
    const countResult = await pool.query(countQuery, params);
    const totalCount  = parseInt(countResult.rows[0].count);

    // Paginated results
    query += ` ORDER BY cl.time DESC`;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page:       parseInt(page),
        limit:      parseInt(limit),
        total:      totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Admin recordings fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/admin/recordings/:call_id ─────────────────────────────────────
// Get recording URL for a specific call
router.get("/recordings/:call_id", async (req, res) => {
  try {
    const { call_id } = req.params;

    const result = await pool.query(
      `SELECT
         cl.id, cl.clinic_id, cl.recording, cl.duration, cl.caller,
         cl.agent_type, cl.time,
         c.name AS clinic_name
       FROM calls cl
       JOIN clinics c ON cl.clinic_id = c.id
       WHERE cl.id = $1`,
      [call_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Call not found" });
    }

    const call = result.rows[0];

    if (!call.recording) {
      return res.status(404).json({ success: false, error: "No recording available for this call" });
    }

    res.json({ success: true, data: call });
  } catch (err) {
    console.error("Admin recording detail error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CREDIT OVERVIEW (per clinic)
// ═══════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/credits/overview ────────────────────────────────────────
// All clinics with their current balance, total credits purchased, total consumed
router.get("/credits/overview", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         c.id                AS clinic_id,
         c.name              AS clinic_name,
         c.credit_balance    AS current_balance,
         c.low_credit_threshold,
         COALESCE(purchased.total_purchased, 0) AS total_credits_purchased,
         COALESCE(consumed.total_consumed, 0)   AS total_credits_consumed,
         purchased.last_recharged_at
       FROM clinics c
       LEFT JOIN (
         SELECT
           clinic_id,
           SUM(amount)       AS total_purchased,
           MAX(created_at)   AS last_recharged_at
         FROM credit_transactions
         WHERE type = 'recharge'
         GROUP BY clinic_id
       ) purchased ON c.id = purchased.clinic_id
       LEFT JOIN (
         SELECT
           clinic_id,
           ABS(SUM(amount))  AS total_consumed
         FROM credit_transactions
         WHERE type = 'deduction'
         GROUP BY clinic_id
       ) consumed ON c.id = consumed.clinic_id
       WHERE c.deleted_at IS NULL
       ORDER BY c.credit_balance ASC`
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        clinic_id:                row.clinic_id,
        clinic_name:              row.clinic_name,
        current_balance:          parseFloat(row.current_balance),
        low_credit_threshold:     row.low_credit_threshold,
        is_low:                   parseFloat(row.current_balance) < row.low_credit_threshold,
        total_credits_purchased:  parseFloat(row.total_credits_purchased),
        total_credits_consumed:   parseFloat(row.total_credits_consumed),
        last_recharged_at:        row.last_recharged_at || null,
      })),
    });
  } catch (err) {
    console.error("Admin credits overview error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
