const express = require("express");
const router  = express.Router();
const pool    = require("../../database/db");

// ─── GET /api/contracts/:clinic_id ────────────────────────────────────────────
router.get("/:clinic_id", async (req, res) => {
  try {
    if (req.clinic_id !== req.params.clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { rows } = await pool.query(
      `SELECT
         id, clinic_id, contract_start, contract_end, agreement,
         created_at, updated_at
       FROM clinic_contracts
       WHERE clinic_id = $1`,
      [req.params.clinic_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Contract not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/contracts (Create contract) ────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { clinic_id, contract_start, contract_end, agreement } = req.body;

    if (!clinic_id || !contract_start || !contract_end) {
      return res.status(400).json({
        success: false,
        error: "clinic_id, contract_start, and contract_end are required"
      });
    }

    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { rows } = await pool.query(
      `INSERT INTO clinic_contracts (clinic_id, contract_start, contract_end, agreement)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (clinic_id) DO UPDATE SET
         contract_start = EXCLUDED.contract_start,
         contract_end = EXCLUDED.contract_end,
         agreement = EXCLUDED.agreement,
         updated_at = NOW()
       RETURNING id, clinic_id, contract_start, contract_end, agreement, created_at, updated_at`,
      [clinic_id, contract_start, contract_end, agreement || false]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/contracts/:clinic_id ──────────────────────────────────────────
router.patch("/:clinic_id", async (req, res) => {
  try {
    if (req.clinic_id !== req.params.clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { contract_start, contract_end, agreement } = req.body;

    const { rows } = await pool.query(
      `UPDATE clinic_contracts
       SET
         contract_start = COALESCE($1, contract_start),
         contract_end = COALESCE($2, contract_end),
         agreement = COALESCE($3, agreement),
         updated_at = NOW()
       WHERE clinic_id = $4
       RETURNING id, clinic_id, contract_start, contract_end, agreement, created_at, updated_at`,
      [contract_start, contract_end, agreement, req.params.clinic_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Contract not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
