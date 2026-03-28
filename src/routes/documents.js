const express = require("express");
const router  = express.Router();
const pool    = require("../../database/db");

// ─── GET /api/documents?clinic_id=<id> ────────────────────────────────────────
router.get("/", async (req, res) => {
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
         id, clinic_id, file_name, file_url, file_type, file_size, doc_type, created_at
       FROM clinic_documents
       WHERE clinic_id = $1
       ORDER BY created_at DESC`,
      [clinic_id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/documents (Create document record) ──────────────────────────────
// Note: This saves the file metadata. Upload actual files to cloud storage separately
router.post("/", async (req, res) => {
  try {
    const { clinic_id, file_name, file_url, file_type, file_size, doc_type } = req.body;

    if (!clinic_id || !file_name || !file_url) {
      return res.status(400).json({
        success: false,
        error: "clinic_id, file_name, and file_url are required"
      });
    }

    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { rows } = await pool.query(
      `INSERT INTO clinic_documents
       (clinic_id, file_name, file_url, file_type, file_size, doc_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, clinic_id, file_name, file_url, file_type, file_size, doc_type, created_at`,
      [clinic_id, file_name, file_url, file_type, file_size, doc_type]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/documents/:id ────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { rows: docRows } = await pool.query(
      `SELECT clinic_id FROM clinic_documents WHERE id = $1`,
      [req.params.id]
    );

    if (docRows.length === 0) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    if (req.clinic_id !== docRows[0].clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    await pool.query(
      `DELETE FROM clinic_documents WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true, message: "Document deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
