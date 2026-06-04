const express = require("express");
const router  = express.Router();
const pool    = require("../../database/db");
const { authenticateToken } = require("../middleware");

// ─── GET /api/clinic/credits/summary/:clinic_id ─────────────────────────────
// Returns balance, last recharged date, total consumed this month
router.get("/summary/:clinic_id", authenticateToken, async (req, res) => {
  try {
    const { clinic_id } = req.params;

    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // Get current balance
    const clinicResult = await pool.query(
      `SELECT credit_balance FROM clinics WHERE id = $1 AND deleted_at IS NULL`,
      [clinic_id]
    );

    if (clinicResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Clinic not found" });
    }

    const balance = parseFloat(clinicResult.rows[0].credit_balance);

    // Get last recharged date
    const lastRechargeResult = await pool.query(
      `SELECT created_at
       FROM credit_transactions
       WHERE clinic_id = $1 AND type = 'recharge'
       ORDER BY created_at DESC
       LIMIT 1`,
      [clinic_id]
    );

    const lastRechargedAt = lastRechargeResult.rows.length > 0
      ? lastRechargeResult.rows[0].created_at
      : null;

    // Get total consumed this month
    const now       = new Date();
    const firstDay  = new Date(now.getFullYear(), now.getMonth(), 1);

    const consumedResult = await pool.query(
      `SELECT COALESCE(ABS(SUM(amount)), 0) AS total_consumed
       FROM credit_transactions
       WHERE clinic_id = $1
         AND type = 'deduction'
         AND created_at >= $2`,
      [clinic_id, firstDay]
    );

    const totalConsumedThisMonth = parseFloat(consumedResult.rows[0].total_consumed);

    res.json({
      success: true,
      data: {
        balance,
        last_recharged_at:         lastRechargedAt,
        total_consumed_this_month: totalConsumedThisMonth,
      },
    });
  } catch (err) {
    console.error("Clinic credits summary error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/clinic/credits/packages ───────────────────────────────────────
// Returns available credit packages with pricing (public endpoint)
router.get("/packages", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, credits, price_inr
       FROM credit_packages
       WHERE is_active = TRUE
       ORDER BY credits ASC`
    );

    res.json({
      success: true,
      data: rows.map(row => ({
        id:        row.id,
        name:      row.name,
        credits:   parseFloat(row.credits),
        price_inr: parseFloat(row.price_inr),
        // Calculate price per credit for display
        price_per_credit: parseFloat((parseFloat(row.price_inr) / parseFloat(row.credits)).toFixed(2)),
      })),
    });
  } catch (err) {
    console.error("Credit packages fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
