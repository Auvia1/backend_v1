const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("Adding columns to clinics and calls tables...");
    await client.query(`
      ALTER TABLE clinics
      ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS low_credit_threshold INTEGER DEFAULT 100;

      ALTER TABLE calls
      ADD COLUMN IF NOT EXISTS credits_used DECIMAL(10,2);
    `);

    console.log("Creating credit_transactions table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          clinic_id UUID,
          type TEXT NOT NULL,
          amount DECIMAL(10,2),
          balance_after DECIMAL(10,2),
          description TEXT,
          reference_id TEXT,
          created_by UUID,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Creating credit_payments table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          clinic_id UUID,
          razorpay_order_id TEXT,
          razorpay_payment_id TEXT,
          razorpay_signature TEXT,
          amount DECIMAL(10,2),
          currency TEXT,
          credits_purchased DECIMAL(10,2),
          status TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Creating/updating credit_packages table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_packages (
          id TEXT PRIMARY KEY,
          name TEXT,
          credits INTEGER,
          price_inr DECIMAL(10,2),
          price_per_credit DECIMAL(10,2),
          is_active BOOLEAN DEFAULT TRUE
      );
    `);

    await client.query(`
      ALTER TABLE credit_packages
      ADD COLUMN IF NOT EXISTS price_per_credit DECIMAL(10,2);
    `);

    console.log("Seeding credit packages...");
    const res = await client.query("SELECT COUNT(*) FROM credit_packages");
    if (parseInt(res.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO credit_packages (id, name, credits, price_inr, price_per_credit, is_active)
        VALUES 
          (gen_random_uuid(), 'Starter Pack', 100, 100.00, 1.00, true),
          (gen_random_uuid(), 'Pro Pack', 500, 475.00, 0.95, true),
          (gen_random_uuid(), 'Premium Pack', 1000, 900.00, 0.90, true);
      `);
      console.log("Inserted default credit packages.");
    } else {
      console.log("Credit packages already exist. Skipping seed.");
    }

    await client.query("COMMIT");
    console.log("Migration successful!");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", e);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
