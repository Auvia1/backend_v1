const jwt  = require("jsonwebtoken");
const pool = require("../database/db");

const JWT_SECRET = process.env.JWT_SECRET;

// ─── Clinic JWT authentication ─────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token      = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, error: "Access token required" });
  }

  try {
    const decoded  = jwt.verify(token, JWT_SECRET);
    req.clinic_id  = decoded.clinic_id;
    req.username   = decoded.username;
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Token expired — please log in again"
        : "Invalid token";
    return res.status(401).json({ success: false, error: message });
  }
}

// ─── Admin JWT authentication ──────────────────────────────────────────────
function authenticateAdminToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token      = authHeader && authHeader.split(" ")[1];

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
    const message =
      err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return res.status(401).json({ success: false, error: message });
  }
}

// ─── Superadmin check (to be used after authenticateAdminToken) ────────────
async function requireSuperAdmin(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT role FROM admin_login WHERE id = $1`,
      [req.admin_id]
    );

    if (rows.length === 0 || rows[0].role !== "superadmin") {
      return res.status(403).json({ success: false, error: "Superadmin privileges required" });
    }

    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = {
  authenticateToken,
  authenticateAdminToken,
  requireSuperAdmin,
};
