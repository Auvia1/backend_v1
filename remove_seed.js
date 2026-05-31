require('dotenv').config();
const pool = require('./database/db');
async function run() {
  try {
    const res = await pool.query("DELETE FROM activity_log WHERE created_at > NOW()");
    console.log(`Deleted ${res.rowCount} future seed data records`);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
