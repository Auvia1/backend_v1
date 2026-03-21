const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const pool    = require("../../database/db");

const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env variable is required");
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token      = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.clinic_id = decoded.clinic_id;
    req.username  = decoded.username;
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Token expired — please log in again"
        : "Invalid token";
    return res.status(401).json({ success: false, error: message });
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "username and password are required",
      });
    }

    const { rows } = await pool.query(
      `SELECT
         id, name, email, phone, address, timezone,
         subscription_plan, subscription_status,
         username, password, deleted_at
       FROM clinics
       WHERE username = $1
       LIMIT 1`,
      [username.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const clinic = rows[0];

    if (clinic.deleted_at) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    if (["suspended", "canceled"].includes(clinic.subscription_status)) {
      return res.status(403).json({
        success: false,
        error: "Your clinic account has been suspended. Please contact support.",
      });
    }

    if (password !== clinic.password) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { clinic_id: clinic.id, username: clinic.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { password: _pw, deleted_at: _da, ...safeClinic } = clinic;

    res.json({
      success: true,
      token,
      clinic: safeClinic,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         id, name, email, phone, address, timezone,
         subscription_plan, subscription_status, username, created_at
       FROM clinics
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [req.clinic_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Clinic not found" });
    }

    res.json({ success: true, clinic: rows[0] });
  } catch (err) {
    console.error("Me fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post("/logout", authenticateToken, (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;