const express = require("express");
const router  = express.Router();
const pool    = require("../../database/db");
const { authenticateToken } = require("../middleware");

// ─── POST /api/agent/check-credits ──────────────────────────────────────────
// Called before agent starts a call; checks if clinic has enough credits
router.post("/check-credits", authenticateToken, async (req, res) => {
  try {
    const { clinic_id, required_credits } = req.body;

    if (!clinic_id || required_credits === undefined) {
      return res.status(400).json({
        success: false,
        error: "clinic_id and required_credits are required",
      });
    }

    const requiredAmount = parseFloat(required_credits);
    if (isNaN(requiredAmount) || requiredAmount < 0) {
      return res.status(400).json({
        success: false,
        error: "required_credits must be a non-negative number",
      });
    }

    const { rows } = await pool.query(
      `SELECT credit_balance FROM clinics WHERE id = $1 AND deleted_at IS NULL`,
      [clinic_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Clinic not found" });
    }

    const currentBalance = parseFloat(rows[0].credit_balance);

    res.json({
      success: true,
      data: {
        allowed:         currentBalance >= requiredAmount,
        current_balance: currentBalance,
        required:        requiredAmount,
      },
    });
  } catch (err) {
    console.error("Check credits error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/agent/deduct-credits ─────────────────────────────────────────
// Called after a call ends; deducts credits using CEIL rounding
router.post("/deduct-credits", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { clinic_id, call_id, duration_minutes } = req.body;

    if (!clinic_id || !call_id || duration_minutes === undefined) {
      return res.status(400).json({
        success: false,
        error: "clinic_id, call_id, and duration_minutes are required",
      });
    }

    const durationFloat = parseFloat(duration_minutes);
    if (isNaN(durationFloat) || durationFloat < 0) {
      return res.status(400).json({
        success: false,
        error: "duration_minutes must be a non-negative number",
      });
    }

    // Use Math.ceil for credit deduction — always round up
    const creditsToDeduct = Math.ceil(durationFloat);

    if (creditsToDeduct === 0) {
      return res.json({
        success: true,
        message: "No credits to deduct (zero duration)",
        data: { credits_deducted: 0 },
      });
    }

    await client.query("BEGIN");

    // Lock and check clinic balance
    const clinicResult = await client.query(
      `SELECT credit_balance FROM clinics WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [clinic_id]
    );

    if (clinicResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Clinic not found" });
    }

    const currentBalance = parseFloat(clinicResult.rows[0].credit_balance);

    if (currentBalance < creditsToDeduct) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "Insufficient credit balance",
        data: {
          current_balance:  currentBalance,
          credits_required: creditsToDeduct,
        },
      });
    }

    // Deduct credits from clinic balance
    const updateResult = await client.query(
      `UPDATE clinics
       SET credit_balance = credit_balance - $1, updated_at = NOW()
       WHERE id = $2
       RETURNING credit_balance`,
      [creditsToDeduct, clinic_id]
    );

    const newBalance = parseFloat(updateResult.rows[0].credit_balance);

    // Update the call record with credits used
    await client.query(
      `UPDATE calls
       SET credits_used = $1, updated_at = NOW()
       WHERE id = $2`,
      [creditsToDeduct, call_id]
    );

    // Insert credit transaction (deduction)
    await client.query(
      `INSERT INTO credit_transactions (clinic_id, type, amount, balance_after, reference_id, description)
       VALUES ($1, 'deduction', $2, $3, $4, $5)`,
      [
        clinic_id,
        -creditsToDeduct,
        newBalance,
        call_id,
        `Call credit deduction (${durationFloat} min → ${creditsToDeduct} credits)`,
      ]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Credits deducted successfully",
      data: {
        credits_deducted: creditsToDeduct,
        duration_minutes: durationFloat,
        new_balance:      newBalance,
        is_low:           newBalance < 50, // Default threshold check
      },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Deduct credits error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
