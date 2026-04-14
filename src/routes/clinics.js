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

// ─── GET /api/clinics/all-with-coordinates (Get all clinics with lat/long for maps) ─
router.get("/all-with-coordinates", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         id, name, email, phone, latitude, longitude,
         city, state, postal_code, clinic_type,
         subscription_plan, subscription_status,
         created_at
       FROM clinics
       WHERE deleted_at IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY created_at DESC`,
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/clinics/map-data (Get clinic map data - optimized for maps) ────────
router.get("/map-data", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         id, name, email, phone, latitude, longitude,
         address, city, state, clinic_type,
         subscription_plan, subscription_status
       FROM clinics
       WHERE deleted_at IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY name`,
    );

    // Transform to GeoJSON format for map libraries
    const features = rows.map(clinic => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [clinic.longitude, clinic.latitude] // GeoJSON uses [lon, lat]
      },
      properties: {
        id: clinic.id,
        name: clinic.name,
        email: clinic.email,
        phone: clinic.phone,
        address: clinic.address,
        city: clinic.city,
        state: clinic.state,
        clinicType: clinic.clinic_type,
        plan: clinic.subscription_plan,
        status: clinic.subscription_status
      }
    }));

    res.json({
      success: true,
      type: "FeatureCollection",
      features: features,
      metadata: {
        total: rows.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/clinics/coordinates-by-city (Get clinic coordinates grouped by city) ──
router.get("/coordinates-by-city", async (req, res) => {
  try {
    const { city } = req.query;

    let query = `SELECT
                   id, name, phone, email, latitude, longitude,
                   address, city, state, clinic_type
                 FROM clinics
                 WHERE deleted_at IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL`;

    const params = [];

    if (city) {
      query += ` AND city ILIKE $1`;
      params.push(`%${city}%`);
    }

    query += ` ORDER BY city, name`;

    const { rows } = await pool.query(query, params);

    // Group by city
    const groupedByCities = {};
    rows.forEach(clinic => {
      if (!groupedByCities[clinic.city]) {
        groupedByCities[clinic.city] = [];
      }
      groupedByCities[clinic.city].push({
        id: clinic.id,
        name: clinic.name,
        phone: clinic.phone,
        email: clinic.email,
        latitude: clinic.latitude,
        longitude: clinic.longitude,
        address: clinic.address,
        type: clinic.clinic_type
      });
    });

    res.json({
      success: true,
      data: groupedByCities,
      totalCities: Object.keys(groupedByCities).length,
      totalClinics: rows.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/clinics/nearby (Get clinics near coordinates with radius) ──────────
router.get("/nearby", async (req, res) => {
  try {
    const { latitude, longitude, radius_km } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "latitude and longitude are required"
      });
    }

    const radiusKm = parseFloat(radius_km) || 10; // Default 10 km radius

    // Calculate distance using Haversine formula
    const { rows } = await pool.query(
      `SELECT
         id, name, email, phone, latitude, longitude,
         address, city, state, clinic_type,
         subscription_plan,
         (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2))
         + sin(radians($1)) * sin(radians(latitude)))) AS distance_km
       FROM clinics
       WHERE deleted_at IS NULL
         AND latitude IS NOT NULL
         AND longitude IS NOT NULL
         AND (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2))
         + sin(radians($1)) * sin(radians(latitude)))) <= $3
       ORDER BY distance_km ASC`,
      [latitude, longitude, radiusKm]
    );

    res.json({
      success: true,
      data: {
        userLocation: { latitude, longitude },
        radiusKm: radiusKm,
        clinicsFound: rows.length,
        clinics: rows
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});


router.get("/search/by-name", async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ success: false, error: "Clinic name is required" });
    }

    const { rows } = await pool.query(
      `SELECT
         id, name, email, phone, address, timezone,
         subscription_plan, subscription_status, username, created_at, updated_at
       FROM clinics
       WHERE name ILIKE $1 AND deleted_at IS NULL`,
      [`%${name}%`]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Clinic not found" });
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/clinics/search/by-name/full (Search clinic by name with all settings) ────────────────────
router.get("/search/by-name/full", async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ success: false, error: "Clinic name is required" });
    }

    // Get clinic basic info
    const clinicRes = await pool.query(
      `SELECT
         id, name, email, phone, address, city, state, postal_code,
         clinic_type, timezone, subscription_plan, subscription_status,
         owner_name, username, created_at, updated_at
       FROM clinics
       WHERE name ILIKE $1 AND deleted_at IS NULL`,
      [`%${name}%`]
    );

    if (clinicRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Clinic not found" });
    }

    // For each clinic, fetch settings and phone numbers
    const clinicsWithSettings = await Promise.all(
      clinicRes.rows.map(async (clinic) => {
        // Get clinic settings
        const settingsRes = await pool.query(
          `SELECT * FROM clinic_settings WHERE clinic_id = $1`,
          [clinic.id]
        );

        // Get phone numbers
        const phonesRes = await pool.query(
          `SELECT id, number, service_type, status, is_active FROM phone_numbers
           WHERE clinic_id = $1 ORDER BY created_at DESC`,
          [clinic.id]
        );

        return {
          clinic: clinic,
          settings: settingsRes.rows[0] || null,
          phone_numbers: phonesRes.rows || []
        };
      })
    );

    res.json({ success: true, data: clinicsWithSettings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/clinics/:id/settings (Get clinic settings by ID) ────────────────────
router.get("/:id/settings", async (req, res) => {
  try {
    // Get clinic basic info
    const clinicRes = await pool.query(
      `SELECT
         id, name, email, phone, address, city, state, postal_code,
         clinic_type, timezone, subscription_plan, subscription_status,
         owner_name, username, created_at, updated_at
       FROM clinics
       WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (clinicRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Clinic not found" });
    }

    const clinic = clinicRes.rows[0];

    // Get clinic settings
    const settingsRes = await pool.query(
      `SELECT * FROM clinic_settings WHERE clinic_id = $1`,
      [req.params.id]
    );

    // Get phone numbers
    const phonesRes = await pool.query(
      `SELECT id, number, service_type, status, is_active FROM phone_numbers
       WHERE clinic_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        clinic: clinic,
        settings: settingsRes.rows[0] || null,
        phone_numbers: phonesRes.rows || []
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/clinics/:id/settings (Update clinic settings) ────────────────────
router.patch("/:id/settings", async (req, res) => {
  try {
    const {
      advance_booking_days,
      min_booking_notice_period,
      cancellation_window_hours,
      followup_time,
      ai_agent_enabled,
      ai_agent_languages,
      whatsapp_number,
      logo_url,
      price_per_appointment,
      is_slots_needed
    } = req.body;

    // Check if clinic exists
    const clinicCheck = await pool.query(
      `SELECT id FROM clinics WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (clinicCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Clinic not found" });
    }

    // Update clinic settings
    const settingsRes = await pool.query(
      `UPDATE clinic_settings
       SET
         advance_booking_days = COALESCE($1, advance_booking_days),
         min_booking_notice_period = COALESCE($2, min_booking_notice_period),
         cancellation_window_hours = COALESCE($3, cancellation_window_hours),
         followup_time = COALESCE($4, followup_time),
         ai_agent_enabled = COALESCE($5, ai_agent_enabled),
         ai_agent_languages = COALESCE($6, ai_agent_languages),
         whatsapp_number = COALESCE($7, whatsapp_number),
         logo_url = COALESCE($8, logo_url),
         price_per_appointment = COALESCE($9, price_per_appointment),
         is_slots_needed = COALESCE($10, is_slots_needed)
       WHERE clinic_id = $11
       RETURNING *`,
      [
        advance_booking_days,
        min_booking_notice_period,
        cancellation_window_hours,
        followup_time,
        ai_agent_enabled,
        ai_agent_languages,
        whatsapp_number,
        logo_url,
        price_per_appointment,
        is_slots_needed,
        req.params.id
      ]
    );

    res.json({
      success: true,
      data: settingsRes.rows[0]
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
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

// ─── GET /api/clinics/:id/is-slots-needed ────────────────────────────────
// Fetch whether clinic uses slot-based booking (true) or token-based (false)
router.get("/:id/is-slots-needed", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT is_slots_needed FROM clinic_settings WHERE clinic_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Clinic settings not found" });
    }

    res.json({
      success: true,
      clinic_id: id,
      is_slots_needed: result.rows[0].is_slots_needed
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;