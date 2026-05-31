const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const pool = require("../../database/db");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env variable is required");
}

// ─── POST /api/adminlogin/register ────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Name, email, and password are required",
      });
    }

    // Check if email already exists
    const checkEmail = await pool.query("SELECT id FROM admin_login WHERE email = $1", [email.trim().toLowerCase()]);
    if (checkEmail.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "An admin with this email already exists",
      });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new admin with pending approval status
    const { rows } = await pool.query(
      `INSERT INTO admin_login (name, email, phone, password_hash, approval_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, phone, approval_status, created_at`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        phone ? phone.trim() : null,
        passwordHash,
        'pending'
      ]
    );

    res.status(201).json({
      success: true,
      message: "Registration submitted. Awaiting admin approval.",
      status: "pending_approval",
      email: rows[0].email,
    });
  } catch (err) {
    console.error("Admin Registration error:", err);
    if (err.code === '23514') {
      return res.status(400).json({ success: false, error: "Validation failed (check email format or 10-digit phone number)" });
    }
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── POST /api/adminlogin ─────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, phone, password_hash, is_active, approval_status, role
       FROM admin_login
       WHERE email = $1
       LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const admin = rows[0];

    // Check approval status
    if (admin.approval_status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: admin.approval_status === 'pending'
          ? "Your registration is pending admin approval. Please try again later."
          : "Your registration was rejected. Please contact support."
      });
    }

    if (!admin.is_active) {
      return res.status(403).json({ success: false, error: "Admin account is inactive" });
    }

    let isMatch = false;
    if (admin.password_hash && admin.password_hash.startsWith("$2")) {
      isMatch = await bcrypt.compare(password, admin.password_hash);
    } else {
      isMatch = (password === admin.password_hash);
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { admin_id: admin.id, email: admin.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { password_hash: _ph, ...safeAdmin } = admin;

    res.json({
      success: true,
      token,
      admin: safeAdmin,
    });
  } catch (err) {
    console.error("Admin Login error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── GET /api/adminlogin/me ─────────────────────────────────────────────────────────
// A helper endpoint to verify the token and get admin details
const authenticateAdminToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin privileges required" });
    }
    req.admin_id = decoded.admin_id;
    next();
  } catch (err) {
    const message = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return res.status(401).json({ success: false, error: message });
  }
};

router.get("/me", authenticateAdminToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, is_active, role, created_at, updated_at
       FROM admin_login
       WHERE id = $1 AND is_active = true
       LIMIT 1`,
      [req.admin_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Admin not found or inactive" });
    }

    res.json({ success: true, admin: rows[0] });
  } catch (err) {
    console.error("Admin Me fetch error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── Middleware to check superadmin role ─────────────────────────────────────────
const requireSuperAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin" || !decoded.is_superadmin) {
      return res.status(403).json({ success: false, error: "Superadmin privileges required" });
    }
    req.admin_id = decoded.admin_id;
    next();
  } catch (err) {
    const message = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return res.status(401).json({ success: false, error: message });
  }
};

// ─── GET /api/adminlogin/users ───────────────────────────────────────────────────
// Get all users (superadmin only)
router.get("/users", authenticateAdminToken, async (req, res) => {
  try {
    // Check if user is superadmin
    const { rows: adminRows } = await pool.query(
      `SELECT role FROM admin_login WHERE id = $1`,
      [req.admin_id]
    );

    if (adminRows.length === 0 || adminRows[0].role !== 'superadmin') {
      return res.status(403).json({ success: false, error: "Superadmin privileges required" });
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, phone, approval_status, role, is_active, created_at, updated_at
       FROM admin_login
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      users: rows,
      count: rows.length
    });
  } catch (err) {
    console.error("Get All Users error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── GET /api/adminlogin/pending ─────────────────────────────────────────────────
// Get all pending users (superadmin only)
router.get("/pending", authenticateAdminToken, async (req, res) => {
  try {
    // Check if user is superadmin
    const { rows: adminRows } = await pool.query(
      `SELECT role FROM admin_login WHERE id = $1`,
      [req.admin_id]
    );

    if (adminRows.length === 0 || adminRows[0].role !== 'superadmin') {
      return res.status(403).json({ success: false, error: "Superadmin privileges required" });
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, phone, approval_status, role, is_active, created_at
       FROM admin_login
       WHERE approval_status = 'pending'
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      users: rows,
      count: rows.length
    });
  } catch (err) {
    console.error("Get Pending Users error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── PATCH /api/adminlogin/:id/approve ──────────────────────────────────────────
// Approve a pending registration (superadmin only)
router.patch("/:id/approve", authenticateAdminToken, async (req, res) => {
  try {
    // Check if user is superadmin
    const { rows: adminRows } = await pool.query(
      `SELECT role FROM admin_login WHERE id = $1`,
      [req.admin_id]
    );

    if (adminRows.length === 0 || adminRows[0].role !== 'superadmin') {
      return res.status(403).json({ success: false, error: "Superadmin privileges required" });
    }

    const { id } = req.params;

    // Check if registration exists and is pending
    const { rows: checkRows } = await pool.query(
      `SELECT id, approval_status FROM admin_login WHERE id = $1`,
      [id]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({ success: false, error: "Registration not found" });
    }

    if (checkRows[0].approval_status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Registration is already ${checkRows[0].approval_status}`
      });
    }

    // Approve the registration
    const { rows } = await pool.query(
      `UPDATE admin_login
       SET approval_status = 'approved', updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, approval_status`,
      [id]
    );

    res.json({
      success: true,
      message: "Registration approved successfully",
      admin: rows[0]
    });
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── PATCH /api/adminlogin/:id/reject ───────────────────────────────────────────
// Reject a pending registration (superadmin only)
router.patch("/:id/reject", authenticateAdminToken, async (req, res) => {
  try {
    // Check if user is superadmin
    const { rows: adminRows } = await pool.query(
      `SELECT role FROM admin_login WHERE id = $1`,
      [req.admin_id]
    );

    if (adminRows.length === 0 || adminRows[0].role !== 'superadmin') {
      return res.status(403).json({ success: false, error: "Superadmin privileges required" });
    }

    const { id } = req.params;

    // Check if registration exists and is pending
    const { rows: checkRows } = await pool.query(
      `SELECT id, approval_status FROM admin_login WHERE id = $1`,
      [id]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({ success: false, error: "Registration not found" });
    }

    if (checkRows[0].approval_status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Registration is already ${checkRows[0].approval_status}`
      });
    }

    // Reject the registration
    const { rows } = await pool.query(
      `UPDATE admin_login
       SET approval_status = 'rejected', updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, approval_status`,
      [id]
    );

    res.json({
      success: true,
      message: "Registration rejected",
      admin: rows[0]
    });
  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});



module.exports = router;
module.exports.authenticateAdminToken = authenticateAdminToken;
