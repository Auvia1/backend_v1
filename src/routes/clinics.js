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

// ─── POST /api/clinics/register (Multi-step form submission) ──────────────────
router.post("/register", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      clinicName, clinicType, address, city, state, postal, phone, email,
      ownerName, ownerEmail, ownerPhone, ownerId,
      receptionistName, receptionistEmail, receptionistPhone, receptionistShift,
      plan, billingCycle, paymentMethod, gstNumber,
      contractStart, contractEnd, agreement,
      username, password, latitude, longitude,
      documents = [],
    } = req.body;

    // Validate required fields
    if (!clinicName || !email || !phone) {
      throw new Error("Clinic name, email, and phone are required");
    }
    if (!username || !password) {
      throw new Error("Username and password are required");
    }
    if (!ownerName || !ownerEmail) {
      throw new Error("Owner name and email are required");
    }

    // 1. Create clinic
    const normalizedPlan = normalizePlan(plan);
    const clinicRes = await client.query(
      `INSERT INTO clinics (
        name, clinic_type, address, city, state, postal_code,
        phone, email, owner_name, username, password,
        latitude, longitude, subscription_plan, subscription_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, name, email`,
      [
        clinicName, clinicType, address, city, state, postal,
        phone, email, ownerName, username, password,
        latitude || null, longitude || null, normalizedPlan, "trial"
      ]
    );

    const clinicId = clinicRes.rows[0].id;

    // 2. Create owner user
    await client.query(
      `INSERT INTO users (clinic_id, name, email, phone, password_hash, role, govt_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [clinicId, ownerName, ownerEmail, ownerPhone, "hashed_placeholder", "clinic_admin", ownerId]
    );

    // 3. Create receptionist user (if provided)
    if (receptionistName && receptionistEmail) {
      await client.query(
        `INSERT INTO users (clinic_id, name, email, phone, password_hash, role, shift_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [clinicId, receptionistName, receptionistEmail, receptionistPhone, "hashed_placeholder", "receptionist", receptionistShift]
      );
    }

    // 4. Save billing info (if provided)
    if (plan || billingCycle || paymentMethod) {
      // Normalize enum values
      const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
      const normalizedBillingCycle = normalizeBillingCycle(billingCycle);

      await client.query(
        `INSERT INTO clinic_billing (clinic_id, plan, billing_cycle, payment_method, gst_number)
         VALUES ($1, $2, $3, $4, $5)`,
        [clinicId, normalizedPlan, normalizedBillingCycle, normalizedPaymentMethod, gstNumber]
      );
    }

    // 5. Save contract info (if provided)
    if (contractStart && contractEnd) {
      await client.query(
        `INSERT INTO clinic_contracts (clinic_id, contract_start, contract_end, agreement)
         VALUES ($1, $2, $3, $4)`,
        [clinicId, contractStart, contractEnd, agreement || false]
      );
    }

    // 6. Save document references (if provided)
    // Note: Files should be uploaded to cloud storage (S3, etc.) separately
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        await client.query(
          `INSERT INTO clinic_documents (clinic_id, file_name, file_url, file_type, doc_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [clinicId, doc.name, doc.url || "", doc.type || "application/octet-stream", doc.docType || "misc"]
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Clinic registered successfully",
      data: { clinic_id: clinicId }
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Registration error:", err);
    res.status(400).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─── GET /api/clinics/:id ─────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    if (req.clinic_id !== req.params.id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { rows } = await pool.query(
      `SELECT
         id, name, email, phone, address, timezone,
         subscription_plan, subscription_status, username, created_at, updated_at
       FROM clinics
       WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Clinic not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/clinics/:id ───────────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    if (req.clinic_id !== req.params.id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { name, email, phone, address, timezone } = req.body;

    const { rows } = await pool.query(
      `UPDATE clinics
       SET
         name       = COALESCE($1, name),
         email      = COALESCE($2, email),
         phone      = COALESCE($3, phone),
         address    = COALESCE($4, address),
         timezone   = COALESCE($5, timezone),
         updated_at = NOW()
       WHERE id = $6 AND deleted_at IS NULL
       RETURNING
         id, name, email, phone, address, timezone,
         subscription_plan, subscription_status, username, updated_at`,
      [name, email, phone, address, timezone, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Clinic not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/clinics/:id/change-password ────────────────────────────────────
router.post("/:id/change-password", async (req, res) => {
  try {
    if (req.clinic_id !== req.params.id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: "current_password and new_password are required",
      });
    }

    const { rows } = await pool.query(
      `SELECT password FROM clinics WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Clinic not found" });
    }

    if (current_password !== rows[0].password) {
      return res.status(401).json({ success: false, error: "Current password is incorrect" });
    }

    await pool.query(
      `UPDATE clinics SET password = $1, updated_at = NOW() WHERE id = $2`,
      [new_password, req.params.id]
    );

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/clinics/admin/stats ─────────────────────────────────────────────
// Get dashboard statistics (total clinics, phone numbers, etc.)
router.get("/admin/stats", async (req, res) => {
  try {
    // Get total clinics
    const clinicCountRes = await pool.query(
      `SELECT COUNT(*) as total FROM clinics WHERE deleted_at IS NULL`
    );
    const totalClinics = parseInt(clinicCountRes.rows[0].total);

    // Get total phone numbers
    const phoneCountRes = await pool.query(
      `SELECT COUNT(*) as total FROM phone_numbers WHERE is_active = TRUE`
    );
    const totalPhoneNumbers = parseInt(phoneCountRes.rows[0].total);

    // Get clinics by subscription status
    const statusRes = await pool.query(
      `SELECT subscription_status, COUNT(*) as count
       FROM clinics
       WHERE deleted_at IS NULL
       GROUP BY subscription_status`
    );
    const statusBreakdown = {};
    statusRes.rows.forEach(row => {
      statusBreakdown[row.subscription_status] = parseInt(row.count);
    });

    // Get clinics by subscription plan
    const planRes = await pool.query(
      `SELECT subscription_plan, COUNT(*) as count
       FROM clinics
       WHERE deleted_at IS NULL
       GROUP BY subscription_plan`
    );
    const planBreakdown = {};
    planRes.rows.forEach(row => {
      planBreakdown[row.subscription_plan] = parseInt(row.count);
    });

    // Get recent clinics (last 10)
    const recentRes = await pool.query(
      `SELECT id, name, email, phone, subscription_plan, subscription_status, created_at
       FROM clinics
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        totalClinics,
        totalPhoneNumbers,
        statusBreakdown,
        planBreakdown,
        recentClinics: recentRes.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/clinics/admin/all ────────────────────────────────────────────────
// Get all clinics with pagination, search, and filters
router.get("/admin/all", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const status = req.query.status || null;
    const plan = req.query.plan || null;

    const offset = (page - 1) * limit;
    let query = `SELECT
                   id, name, email, phone, clinic_type,
                   subscription_plan, subscription_status,
                   owner_name, created_at, updated_at
                 FROM clinics
                 WHERE deleted_at IS NULL`;

    const params = [];
    let paramCount = 1;

    // Search by name, email, or phone
    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Filter by status
    if (status) {
      query += ` AND subscription_status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Filter by plan
    if (plan) {
      query += ` AND subscription_plan = $${paramCount}`;
      params.push(plan);
      paramCount++;
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT.*?FROM/,
      "SELECT COUNT(*) as total FROM"
    );
    const countRes = await pool.query(countQuery, params);
    const totalClinics = parseInt(countRes.rows[0].total);

    // Get paginated results
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        clinics: rows,
        pagination: {
          page,
          limit,
          total: totalClinics,
          pages: Math.ceil(totalClinics / limit)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;