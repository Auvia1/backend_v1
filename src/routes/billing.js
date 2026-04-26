const express = require("express");
const router  = express.Router();
const pool    = require("../../database/db");

// Normalize payment method to match enum values
function normalizePaymentMethod(method) {
  if (!method) return null;
  const normalized = {
    'card': 'Card',
    'Card': 'Card',
    'upi': 'UPI',
    'UPI': 'UPI',
    'bank transfer': 'Bank Transfer',
    'bank_transfer': 'Bank Transfer',
    'Bank Transfer': 'Bank Transfer'
  };
  return normalized[method] || method;
}

// Normalize plan to match enum values
function normalizePlan(plan) {
  if (!plan) return 'trial';
  const normalized = {
    'starter': 'Starter',
    'Starter': 'Starter',
    'growth': 'Growth',
    'Growth': 'Growth',
    'enterprise': 'Enterprise',
    'Enterprise': 'Enterprise',
    'trial': 'trial'
  };
  return normalized[plan] || plan;
}

// Normalize billing cycle to match enum values
function normalizeBillingCycle(cycle) {
  if (!cycle) return 'Monthly';
  const normalized = {
    'monthly': 'Monthly',
    'Monthly': 'Monthly',
    'quarterly': 'Quarterly',
    'Quarterly': 'Quarterly',
    'annually': 'Annually',
    'Annually': 'Annually'
  };
  return normalized[cycle] || cycle;
}

// ─── GET /api/billing/:clinic_id ──────────────────────────────────────────────
router.get("/:clinic_id", async (req, res) => {
  try {
    if (req.clinic_id !== req.params.clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { rows } = await pool.query(
      `SELECT
         id, clinic_id, plan, billing_cycle, payment_method,
         card_last4, card_name, card_expiry, gst_number, monthly_amount,
         created_at, updated_at
       FROM clinic_billing
       WHERE clinic_id = $1`,
      [req.params.clinic_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Billing info not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/billing (Create billing) ────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      clinic_id, plan, billing_cycle, payment_method,
      card_last4, card_name, card_expiry, gst_number, monthly_amount
    } = req.body;

    if (!clinic_id || !plan) {
      return res.status(400).json({
        success: false,
        error: "clinic_id and plan are required"
      });
    }

    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // Normalize enum values
    const normalizedPlan = normalizePlan(plan);
    const normalizedPaymentMethod = normalizePaymentMethod(payment_method);
    const normalizedBillingCycle = normalizeBillingCycle(billing_cycle);

    const { rows } = await pool.query(
      `INSERT INTO clinic_billing
       (clinic_id, plan, billing_cycle, payment_method, card_last4, card_name, card_expiry, gst_number, monthly_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, clinic_id, plan, billing_cycle, payment_method, card_last4, card_name, card_expiry, gst_number, monthly_amount`,
      [clinic_id, normalizedPlan, normalizedBillingCycle, normalizedPaymentMethod, card_last4, card_name, card_expiry, gst_number, monthly_amount]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/billing/:clinic_id ────────────────────────────────────────────
router.patch("/:clinic_id", async (req, res) => {
  try {
    if (req.clinic_id !== req.params.clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const {
      plan, billing_cycle, payment_method,
      card_last4, card_name, card_expiry, gst_number, monthly_amount
    } = req.body;

    // Normalize enum values
    const normalizedPlan = normalizePlan(plan);
    const normalizedPaymentMethod = normalizePaymentMethod(payment_method);
    const normalizedBillingCycle = normalizeBillingCycle(billing_cycle);

    const { rows } = await pool.query(
      `UPDATE clinic_billing
       SET
         plan = COALESCE($1, plan),
         billing_cycle = COALESCE($2, billing_cycle),
         payment_method = COALESCE($3, payment_method),
         card_last4 = COALESCE($4, card_last4),
         card_name = COALESCE($5, card_name),
         card_expiry = COALESCE($6, card_expiry),
         gst_number = COALESCE($7, gst_number),
         monthly_amount = COALESCE($8, monthly_amount),
         updated_at = NOW()
       WHERE clinic_id = $9
       RETURNING id, clinic_id, plan, billing_cycle, payment_method, card_last4, card_name, card_expiry, gst_number, monthly_amount`,
      [normalizedPlan, normalizedBillingCycle, normalizedPaymentMethod, card_last4, card_name, card_expiry, gst_number, monthly_amount, req.params.clinic_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Billing info not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
