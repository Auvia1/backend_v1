const express  = require("express");
const router   = express.Router();
const crypto   = require("crypto");
const pool     = require("../../database/db");
const Razorpay = require("razorpay");
const { authenticateToken, authenticateAdminToken, requireSuperAdmin } = require("../middleware");

// ─── Razorpay instance ─────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── GET /api/credits/balance/:clinic_id ────────────────────────────────────
// Fetch current credit balance for a clinic
router.get("/balance/:clinic_id", authenticateToken, async (req, res) => {
  try {
    const { clinic_id } = req.params;

    // Verify the authenticated clinic matches the requested one
    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { rows } = await pool.query(
      `SELECT credit_balance, low_credit_threshold
       FROM clinics
       WHERE id = $1 AND deleted_at IS NULL`,
      [clinic_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Clinic not found" });
    }

    const clinic = rows[0];

    res.json({
      success: true,
      data: {
        balance: parseFloat(clinic.credit_balance),
        low_credit_threshold: clinic.low_credit_threshold,
        is_low: parseFloat(clinic.credit_balance) < clinic.low_credit_threshold,
      },
    });
  } catch (err) {
    console.error("Credit balance fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/credits/adjust ───────────────────────────────────────────────
// Manually adjust credits (super_admin only, for corrections/refunds)
router.post("/adjust", authenticateAdminToken, requireSuperAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { clinic_id, amount, description } = req.body;

    if (!clinic_id || amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        error: "clinic_id and amount are required",
      });
    }

    const adjustAmount = parseFloat(amount);
    if (isNaN(adjustAmount) || adjustAmount === 0) {
      return res.status(400).json({
        success: false,
        error: "amount must be a non-zero number (positive to add, negative to subtract)",
      });
    }

    await client.query("BEGIN");

    // Update credit balance
    const updateResult = await client.query(
      `UPDATE clinics
       SET credit_balance = credit_balance + $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING credit_balance`,
      [adjustAmount, clinic_id]
    );

    if (updateResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Clinic not found" });
    }

    const newBalance = parseFloat(updateResult.rows[0].credit_balance);

    // Prevent negative balance
    if (newBalance < 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "Adjustment would result in negative balance",
      });
    }

    // Insert credit transaction
    await client.query(
      `INSERT INTO credit_transactions (clinic_id, type, amount, balance_after, description, created_by)
       VALUES ($1, 'adjustment', $2, $3, $4, $5)`,
      [clinic_id, adjustAmount, newBalance, description || "Manual credit adjustment", req.admin_id]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Credits adjusted successfully",
      data: {
        clinic_id,
        adjustment: adjustAmount,
        new_balance: newBalance,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Credit adjustment error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─── POST /api/credits/create-order ─────────────────────────────────────────
// Create a Razorpay order and insert a pending credit_payments row
router.post("/create-order", authenticateToken, async (req, res) => {
  try {
    const { package_id, clinic_id } = req.body;

    if (!package_id || !clinic_id) {
      return res.status(400).json({
        success: false,
        error: "package_id and clinic_id are required",
      });
    }

    // Verify the authenticated clinic matches
    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // Fetch the credit package
    const packageResult = await pool.query(
      `SELECT id, name, credits, price_inr
       FROM credit_packages
       WHERE id = $1 AND is_active = TRUE`,
      [package_id]
    );

    if (packageResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Credit package not found or inactive" });
    }

    const pkg = packageResult.rows[0];

    // Create Razorpay order (amount in paise)
    const order = await razorpay.orders.create({
      amount:   Math.round(parseFloat(pkg.price_inr) * 100),
      currency: "INR",
      receipt:  `credit_${clinic_id}_${Date.now()}`,
      notes: {
        clinic_id,
        package_id,
        credits: pkg.credits.toString(),
      },
    });

    // Insert pending payment record
    await pool.query(
      `INSERT INTO credit_payments (clinic_id, razorpay_order_id, amount, currency, credits_purchased, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [clinic_id, order.id, pkg.price_inr, "INR", pkg.credits]
    );

    res.json({
      success: true,
      data: {
        razorpay_order_id: order.id,
        amount:            Math.round(parseFloat(pkg.price_inr) * 100),
        currency:          "INR",
        package_name:      pkg.name,
        credits:           parseFloat(pkg.credits),
        key_id:            process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/credits/verify-payment ───────────────────────────────────────
// Verify Razorpay signature, add credits, update payment record
router.post("/verify-payment", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
      });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: "Invalid payment signature" });
    }

    await client.query("BEGIN");

    // Fetch and lock the payment record
    const paymentResult = await client.query(
      `SELECT id, clinic_id, credits_purchased, status
       FROM credit_payments
       WHERE razorpay_order_id = $1
       FOR UPDATE`,
      [razorpay_order_id]
    );

    if (paymentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Payment record not found" });
    }

    const payment = paymentResult.rows[0];

    // Idempotency: if already processed, return success
    if (payment.status === "success") {
      await client.query("ROLLBACK");
      return res.json({
        success: true,
        message: "Payment already verified",
        data: { already_processed: true },
      });
    }

    // Update payment record
    await client.query(
      `UPDATE credit_payments
       SET razorpay_payment_id = $1,
           razorpay_signature  = $2,
           status              = 'success',
           updated_at          = NOW()
       WHERE id = $3`,
      [razorpay_payment_id, razorpay_signature, payment.id]
    );

    // Add credits to clinic balance
    const creditAmount = parseFloat(payment.credits_purchased);
    const updateResult = await client.query(
      `UPDATE clinics
       SET credit_balance = credit_balance + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING credit_balance`,
      [creditAmount, payment.clinic_id]
    );

    const newBalance = parseFloat(updateResult.rows[0].credit_balance);

    // Insert credit transaction
    await client.query(
      `INSERT INTO credit_transactions (clinic_id, type, amount, balance_after, reference_id, description)
       VALUES ($1, 'recharge', $2, $3, $4, $5)`,
      [
        payment.clinic_id,
        creditAmount,
        newBalance,
        payment.id,
        `Credit recharge via Razorpay (Order: ${razorpay_order_id})`,
      ]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Payment verified and credits added",
      data: {
        credits_added: creditAmount,
        new_balance:   newBalance,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Verify payment error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─── POST /api/credits/webhook ──────────────────────────────────────────────
// Razorpay webhook fallback — processes payment.captured events
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const client = await pool.connect();
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    const receivedSignature = req.headers["x-razorpay-signature"];
    if (!receivedSignature) {
      return res.status(400).json({ success: false, error: "Missing webhook signature" });
    }

    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== receivedSignature) {
      return res.status(400).json({ success: false, error: "Invalid webhook signature" });
    }

    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Only process payment.captured events
    if (event.event !== "payment.captured") {
      return res.json({ success: true, message: "Event ignored" });
    }

    const paymentEntity   = event.payload.payment.entity;
    const razorpayOrderId = paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity.id;

    if (!razorpayOrderId) {
      return res.json({ success: true, message: "No order_id in payment, skipping" });
    }

    await client.query("BEGIN");

    // Fetch and lock the payment record
    const paymentResult = await client.query(
      `SELECT id, clinic_id, credits_purchased, status
       FROM credit_payments
       WHERE razorpay_order_id = $1
       FOR UPDATE`,
      [razorpayOrderId]
    );

    if (paymentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.json({ success: true, message: "Payment record not found, skipping" });
    }

    const payment = paymentResult.rows[0];

    // Idempotency: if already processed, skip
    if (payment.status === "success") {
      await client.query("ROLLBACK");
      return res.json({ success: true, message: "Already processed" });
    }

    // Update payment record
    await client.query(
      `UPDATE credit_payments
       SET razorpay_payment_id = $1,
           status              = 'success',
           updated_at          = NOW()
       WHERE id = $2`,
      [razorpayPaymentId, payment.id]
    );

    // Add credits to clinic
    const creditAmount = parseFloat(payment.credits_purchased);
    const updateResult = await client.query(
      `UPDATE clinics
       SET credit_balance = credit_balance + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING credit_balance`,
      [creditAmount, payment.clinic_id]
    );

    const newBalance = parseFloat(updateResult.rows[0].credit_balance);

    // Insert credit transaction
    await client.query(
      `INSERT INTO credit_transactions (clinic_id, type, amount, balance_after, reference_id, description)
       VALUES ($1, 'recharge', $2, $3, $4, $5)`,
      [
        payment.clinic_id,
        creditAmount,
        newBalance,
        payment.id,
        `Credit recharge via Razorpay webhook (Order: ${razorpayOrderId})`,
      ]
    );

    await client.query("COMMIT");

    console.log(`[Webhook] Credits added for clinic ${payment.clinic_id}: +${creditAmount}`);
    res.json({ success: true, message: "Payment processed via webhook" });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Webhook processing error:", err);
    res.status(500).json({ success: false, error: "Webhook processing failed" });
  } finally {
    client.release();
  }
});

// ─── GET /api/credits/transactions/:clinic_id ───────────────────────────────
// Paginated list of all credit transactions for a clinic
router.get("/transactions/:clinic_id", authenticateToken, async (req, res) => {
  try {
    const { clinic_id } = req.params;

    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { type, start_date, end_date, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT id, clinic_id, type, amount, balance_after, reference_id, description, created_at
      FROM credit_transactions
      WHERE clinic_id = $1
    `;
    const params  = [clinic_id];
    let paramIdx  = 2;

    if (type) {
      const allowed = ["recharge", "deduction", "adjustment"];
      if (!allowed.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid type. Allowed: ${allowed.join(", ")}`,
        });
      }
      query += ` AND type = $${paramIdx++}`;
      params.push(type);
    }

    if (start_date) {
      query += ` AND DATE(created_at) >= $${paramIdx++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(created_at) <= $${paramIdx++}`;
      params.push(end_date);
    }

    // Count query
    const countQuery  = query.replace(/SELECT.*?FROM/, "SELECT COUNT(*) FROM");
    const countResult = await pool.query(countQuery, params);
    const totalCount  = parseInt(countResult.rows[0].count);

    // Paginated results
    query += ` ORDER BY created_at DESC`;
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
    console.error("Credit transactions fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/credits/payments/:clinic_id ───────────────────────────────────
// Paginated list of all payment records for a clinic
router.get("/payments/:clinic_id", authenticateToken, async (req, res) => {
  try {
    const { clinic_id } = req.params;

    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { status, start_date, end_date, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT id, clinic_id, razorpay_order_id, razorpay_payment_id,
             amount, currency, credits_purchased, status, created_at, updated_at
      FROM credit_payments
      WHERE clinic_id = $1
    `;
    const params = [clinic_id];
    let paramIdx = 2;

    if (status) {
      const allowed = ["pending", "success", "failed"];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Allowed: ${allowed.join(", ")}`,
        });
      }
      query += ` AND status = $${paramIdx++}`;
      params.push(status);
    }

    if (start_date) {
      query += ` AND DATE(created_at) >= $${paramIdx++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(created_at) <= $${paramIdx++}`;
      params.push(end_date);
    }

    // Count query
    const countQuery  = query.replace(/SELECT.*?FROM/, "SELECT COUNT(*) FROM");
    const countResult = await pool.query(countQuery, params);
    const totalCount  = parseInt(countResult.rows[0].count);

    // Paginated results
    query += ` ORDER BY created_at DESC`;
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
    console.error("Credit payments fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
