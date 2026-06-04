-- ==========================================================
-- 💳 Credit Management System — Migration
-- Adds credit balance, payment tracking, transaction ledger,
-- and credit packages for the Razorpay-based credit system.
-- ==========================================================

-- 1. Add credit_balance and low_credit_threshold to clinics
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_credit_threshold INT NOT NULL DEFAULT 50;

-- 2. Add credits_used to calls
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS credits_used NUMERIC(10,2) NOT NULL DEFAULT 0;

-- 3. Create credit_payments table (Razorpay payment records)
CREATE TABLE IF NOT EXISTS credit_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  razorpay_order_id   VARCHAR(255) NOT NULL UNIQUE,
  razorpay_payment_id VARCHAR(255),
  razorpay_signature  TEXT,
  amount              NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency            VARCHAR(10) NOT NULL DEFAULT 'INR',
  credits_purchased   NUMERIC(10,2) NOT NULL CHECK (credits_purchased > 0),
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'success', 'failed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_payments_clinic_id ON credit_payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_status ON credit_payments(status);
CREATE INDEX IF NOT EXISTS idx_credit_payments_order_id ON credit_payments(razorpay_order_id);

-- 4. Create credit_transactions table (ledger of all credit movements)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  type          VARCHAR(20) NOT NULL
                CHECK (type IN ('recharge', 'deduction', 'adjustment')),
  amount        NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  reference_id  UUID,
  description   TEXT,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_clinic_id ON credit_transactions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- 5. Create credit_packages table
CREATE TABLE IF NOT EXISTS credit_packages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  credits    NUMERIC(10,2) NOT NULL CHECK (credits > 0),
  price_inr  NUMERIC(10,2) NOT NULL CHECK (price_inr > 0),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Seed default credit packages
INSERT INTO credit_packages (name, credits, price_inr) VALUES
  ('Starter',    100,  99),
  ('Growth',     500,  449),
  ('Pro',        1000, 799),
  ('Enterprise', 5000, 3499)
ON CONFLICT DO NOTHING;
