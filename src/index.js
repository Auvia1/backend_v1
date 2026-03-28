
const express   = require("express");
const cors      = require("cors");
const path      = require("path");
const http      = require("http");
const WebSocket = require("ws");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { registerClient } = require("./activityBroadcaster");

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server, path: "/ws/activity" });

const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

wss.on("connection", (ws) => {
  console.log(`[WS] Client connected (${wss.clients.size} total)`);
  registerClient(ws);

  const ping = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, 30_000);

  ws.on("close", () => {
    clearInterval(ping);
    console.log(`[WS] Client disconnected (${wss.clients.size} remaining)`);
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",         require("./routes/auth"));
app.use("/api/clinics",      require("./routes/clinics"));
app.use("/api/users",        require("./routes/users"));
app.use("/api/appointments", require("./routes/appointments"));
app.use("/api/doctors",      require("./routes/doctors"));
app.use("/api/patients",     require("./routes/patients"));
app.use("/api/activity",     require("./routes/activity"));
app.use("/api/billing",      require("./routes/billing"));
app.use("/api/documents",    require("./routes/documents"));
app.use("/api/contracts",    require("./routes/contracts"));
app.use("/api/phone-numbers", require("./routes/phone-numbers"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    const pool = require("../database/db");
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected", time: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: "error", db: "disconnected", error: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.url}` });
});

app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: err.message || "Internal server error" });
});

server.listen(PORT, "0.0.0.0", () => {
  const today = new Date().toISOString().split("T")[0];
  console.log(`\n🚀 Server → http://0.0.0.0:${PORT}`);
  console.log(`   WebSocket → ws://0.0.0.0:${PORT}/ws/activity`);
  console.log(`   Health    → http://0.0.0.0:${PORT}/api/health`);
  console.log(`   Auth      → http://0.0.0.0:${PORT}/api/auth/login`);
  console.log(`   Clinic Reg → http://0.0.0.0:${PORT}/api/clinics/register (POST)`);
  console.log(`   Users     → http://0.0.0.0:${PORT}/api/users?clinic_id=<id>`);
  console.log(`   Billing   → http://0.0.0.0:${PORT}/api/billing/<clinic_id>`);
  console.log(`   Documents → http://0.0.0.0:${PORT}/api/documents?clinic_id=<id>`);
  console.log(`   Contracts → http://0.0.0.0:${PORT}/api/contracts/<clinic_id>\n`);
});
