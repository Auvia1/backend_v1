const express = require("express");
const router  = express.Router();
const pool    = require("../../database/db");
const { authenticateToken } = require("./auth");

// ─── GET /api/users?clinic_id=<id> ────────────────────────────────────────────
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { clinic_id } = req.query;

    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id is required" });
    }

    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { rows } = await pool.query(
      `SELECT
         id, clinic_id, name, email, phone, role, govt_id, shift_hours, is_active, created_at
       FROM users
       WHERE clinic_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [clinic_id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         id, clinic_id, name, email, phone, role, govt_id, shift_hours, is_active, created_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (req.clinic_id !== rows[0].clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/users (Create user) ────────────────────────────────────────────
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { clinic_id, name, email, phone, role, govt_id, shift_hours } = req.body;

    if (!clinic_id || !name || !email || !role) {
      return res.status(400).json({
        success: false,
        error: "clinic_id, name, email, and role are required"
      });
    }

    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { rows } = await pool.query(
      `INSERT INTO users (clinic_id, name, email, phone, password_hash, role, govt_id, shift_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, clinic_id, name, email, phone, role, is_active, created_at`,
      [clinic_id, name, email, phone, "hashed_placeholder", role, govt_id, shift_hours]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────
router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, role, govt_id, shift_hours, is_active } = req.body;

    const { rows: userRows } = await pool.query(
      `SELECT clinic_id FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (req.clinic_id !== userRows[0].clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { rows } = await pool.query(
      `UPDATE users
       SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         phone = COALESCE($3, phone),
         role = COALESCE($4, role),
         govt_id = COALESCE($5, govt_id),
         shift_hours = COALESCE($6, shift_hours),
         is_active = COALESCE($7, is_active)
       WHERE id = $8 AND deleted_at IS NULL
       RETURNING id, clinic_id, name, email, phone, role, is_active, created_at`,
      [name, email, phone, role, govt_id, shift_hours, is_active, req.params.id]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { rows: userRows } = await pool.query(
      `SELECT clinic_id FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (req.clinic_id !== userRows[0].clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    await pool.query(
      `UPDATE users SET deleted_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
