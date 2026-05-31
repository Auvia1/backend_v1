require('dotenv').config();
const pool = require('./database/db');

async function logActivity(clinic_id, event_type, title, meta = null, entity_type = null, entity_id = null, user_id = null) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO activity_log (clinic_id, event_type, title, entity_type, entity_id, user_id, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [clinic_id, event_type, title, entity_type, entity_id, user_id, meta ? JSON.stringify(meta) : null]
    );
    console.log("Success:", rows);
  } catch (err) {
    console.error("[activity_log] Failed to write:", err.message);
  }
}

async function test() {
  try {
    const res1 = await pool.query("SELECT id FROM clinics LIMIT 1");
    const clinic_id = res1.rows[0].id;
    const res2 = await pool.query("SELECT id FROM appointments LIMIT 1");
    const appointment_id = res2.rows[0].id;

    await logActivity(
      clinic_id,
      "manual_booking",
      "Receptionist booked John Doe with Dr. Smith (slot-based)",
      { appointment_id },
      "appointment",
      appointment_id,
      "" // Pass empty string as created_by
    );
  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    pool.end();
  }
}
test();
