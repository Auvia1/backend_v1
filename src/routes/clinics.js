const express = require("express");
const router  = express.Router();
const pool    = require("../../database/db");
const { authenticateToken } = require("./auth");

// ─── GET /api/clinics/:id ─────────────────────────────────────────────────────
router.get("/:id", authenticateToken, async (req, res) => {
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
router.patch("/:id", authenticateToken, async (req, res) => {
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
router.post("/:id/change-password", authenticateToken, async (req, res) => {
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

module.exports = router;