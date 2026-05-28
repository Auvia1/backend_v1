const express = require("express");
const router  = express.Router();
const pool    = require("../../database/db");

// ─── GET /api/documents?clinic_id=<id>&doc_type=<type>&limit=<n>&offset=<n> ────
// Retrieve all documents for a clinic with optional filtering and pagination
router.get("/", async (req, res) => {
  try {
    const { clinic_id, doc_type, limit = 50, offset = 0 } = req.query;

    if (!clinic_id) {
      return res.status(400).json({ success: false, error: "clinic_id is required" });
    }

    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    let query = `SELECT
       id, clinic_id, file_name, file_url, file_type, file_size, doc_type, uploaded_by, created_at
     FROM clinic_documents
     WHERE clinic_id = $1`;

    const params = [clinic_id];
    let paramCount = 2;

    // Optional filter by doc_type
    if (doc_type) {
      query += ` AND doc_type = $${paramCount}`;
      params.push(doc_type);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM clinic_documents WHERE clinic_id = $1`;
    const countParams = [clinic_id];
    if (doc_type) {
      countQuery += ` AND doc_type = $2`;
      countParams.push(doc_type);
    }
    const { rows: countRows } = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: parseInt(countRows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/documents/:id ───────────────────────────────────────────────────
// Retrieve a single document by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT
         id, clinic_id, file_name, file_url, file_type, file_size, doc_type, uploaded_by, created_at
       FROM clinic_documents
       WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    // Authorization check
    if (req.clinic_id !== rows[0].clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/documents (Create document record) ──────────────────────────────
// Create a single document record with metadata (file must be pre-uploaded to cloud storage)
router.post("/", async (req, res) => {
  try {
    const { clinic_id, file_name, file_url, file_type, file_size, doc_type } = req.body;
    const uploaded_by = req.user_id; // Get from authenticated user

    // Validation
    if (!clinic_id || !file_name || !file_url) {
      return res.status(400).json({
        success: false,
        error: "clinic_id, file_name, and file_url are required"
      });
    }

    // Authorization check
    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { rows } = await pool.query(
      `INSERT INTO clinic_documents
       (clinic_id, file_name, file_url, file_type, file_size, doc_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, clinic_id, file_name, file_url, file_type, file_size, doc_type, uploaded_by, created_at`,
      [clinic_id, file_name, file_url, file_type || null, file_size || null, doc_type || null, uploaded_by]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── POST /api/documents/bulk (Create multiple documents) ──────────────────────
// Bulk upload multiple document records in a single transaction
router.post("/bulk", async (req, res) => {
  const client = await pool.connect();
  try {
    const { clinic_id, documents } = req.body;
    const uploaded_by = req.user_id;

    // Validation
    if (!clinic_id || !documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        error: "clinic_id and documents array (with at least 1 item) are required"
      });
    }

    // Authorization check
    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // Validate all documents have required fields
    for (const doc of documents) {
      if (!doc.file_name || !doc.file_url) {
        return res.status(400).json({
          success: false,
          error: "Each document must have file_name and file_url"
        });
      }
    }

    await client.query("BEGIN");

    const insertedDocs = [];
    for (const doc of documents) {
      const { rows } = await client.query(
        `INSERT INTO clinic_documents
         (clinic_id, file_name, file_url, file_type, file_size, doc_type, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, clinic_id, file_name, file_url, file_type, file_size, doc_type, uploaded_by, created_at`,
        [
          clinic_id,
          doc.file_name,
          doc.file_url,
          doc.file_type || null,
          doc.file_size || null,
          doc.doc_type || null,
          uploaded_by
        ]
      );
      insertedDocs.push(rows[0]);
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: `${insertedDocs.length} documents created successfully`,
      data: insertedDocs
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─── PATCH /api/documents/:id (Update document metadata) ──────────────────────
// Update document metadata (file_name, file_type, file_size, doc_type)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { file_name, file_type, file_size, doc_type } = req.body;

    // Get existing document
    const { rows: docRows } = await pool.query(
      `SELECT clinic_id FROM clinic_documents WHERE id = $1`,
      [id]
    );

    if (docRows.length === 0) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    // Authorization check
    if (req.clinic_id !== docRows[0].clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // Update only provided fields
    const { rows } = await pool.query(
      `UPDATE clinic_documents
       SET
         file_name = COALESCE($1, file_name),
         file_type = COALESCE($2, file_type),
         file_size = COALESCE($3, file_size),
         doc_type = COALESCE($4, doc_type)
       WHERE id = $5
       RETURNING id, clinic_id, file_name, file_url, file_type, file_size, doc_type, uploaded_by, created_at`,
      [file_name, file_type, file_size, doc_type, id]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/documents/:id ───────────────────────────────────────────────
// Delete a document record (does not delete the file from cloud storage)
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

// ─── DELETE /api/documents/clinic/:clinic_id (Delete all documents for clinic) ─
// Delete all documents for a clinic (use with caution - typically admin only)
router.delete("/clinic/:clinic_id", async (req, res) => {
  try {
    const { clinic_id } = req.params;

    // Authorization check - admin or clinic owner only
    if (req.clinic_id !== clinic_id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { rows } = await pool.query(
      `DELETE FROM clinic_documents WHERE clinic_id = $1 RETURNING id`,
      [clinic_id]
    );

    res.json({
      success: true,
      message: `${rows.length} documents deleted successfully`
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;

module.exports = router;
