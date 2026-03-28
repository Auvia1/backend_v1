const express = require("express");
const router = express.Router();
const pool = require("../../database/db");

// ─── GET /api/phone-numbers?clinic_id=<id> (Get all phone numbers for a clinic) ─
router.get("/", async (req, res) => {
  try {
    const { clinic_id } = req.query;

    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id is required" });
    }

    const { rows } = await pool.query(
      `SELECT id, clinic_id, number, service_type, status, is_active, created_at, updated_at
       FROM phone_numbers
       WHERE clinic_id = $1
       ORDER BY created_at DESC`,
      [clinic_id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/phone-numbers (Create new phone number) ──────────────────────────
router.post("/", async (req, res) => {
  try {
    const { clinic_id, number, service_type, status, is_active } = req.body;

    // Validate required fields
    if (!clinic_id || !number) {
      return res.status(400).json({
        success: false,
        error: "clinic_id and number are required"
      });
    }

    // Validate clinic exists
    const clinicCheck = await pool.query(
      `SELECT id FROM clinics WHERE id = $1 AND deleted_at IS NULL`,
      [clinic_id]
    );

    if (clinicCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Clinic not found" });
    }

    // Create phone number
    const { rows } = await pool.query(
      `INSERT INTO phone_numbers (clinic_id, number, service_type, status, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, clinic_id, number, service_type, status, is_active, created_at, updated_at`,
      [
        clinic_id,
        number,
        service_type || "Reception Line",
        status || "Live",
        is_active !== undefined ? is_active : true
      ]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    // Handle unique constraint violation (duplicate phone number)
    if (err.code === "23505") {
      return res.status(400).json({
        success: false,
        error: "This phone number already exists in the system"
      });
    }
    // Handle invalid phone number format
    if (err.code === "23514") {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format. Use digits, spaces, hyphens, and optional + sign."
      });
    }
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── GET /api/phone-numbers/:id (Get single phone number) ────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, clinic_id, number, service_type, status, is_active, created_at, updated_at
       FROM phone_numbers
       WHERE id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Phone number not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/phone-numbers/:id (Update phone number) ────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const { service_type, status, is_active } = req.body;

    // Verify phone number exists
    const phoneCheck = await pool.query(
      `SELECT id FROM phone_numbers WHERE id = $1`,
      [req.params.id]
    );

    if (phoneCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Phone number not found" });
    }

    // Update phone number
    const { rows } = await pool.query(
      `UPDATE phone_numbers
       SET
         service_type = COALESCE($1, service_type),
         status = COALESCE($2, status),
         is_active = COALESCE($3, is_active),
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, clinic_id, number, service_type, status, is_active, created_at, updated_at`,
      [service_type, status, is_active, req.params.id]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/phone-numbers/:id (Delete phone number) ─────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM phone_numbers WHERE id = $1
       RETURNING id`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Phone number not found" });
    }

    res.json({ success: true, message: "Phone number deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
