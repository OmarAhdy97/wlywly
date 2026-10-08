-- ==============================================================================
-- MIGRATION: CLIENT FINANCIAL MANAGEMENT & TRANSACTIONS
-- Table: client_transactions
-- Multi-tenancy isolation: auth.uid() = user_id
-- SAFE & NON-DESTRUCTIVE: Creates table if not exists and adds columns safely
-- ==============================================================================

-- 1. Create client_transactions table
CREATE TABLE IF NOT EXISTS client_transactions (
  id TEXT PRIMARY KEY DEFAULT ('tx_' || gen_random_uuid()::text),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  case_id TEXT,
  type TEXT NOT NULL, -- 'fee', 'client_expense', 'payment', 'advance', 'settlement', 'refund', 'adjustment', 'expense'
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  description TEXT,
  payment_method TEXT, -- 'cash', 'bank_transfer', 'vodafone_cash', 'instapay', 'check', 'other'
  expense_category TEXT, -- 'court_fees', 'bailiff_fees', 'expert_fees', 'travel', 'documentation', 'postal', 'other'
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add safe columns in case table already exists without some fields
ALTER TABLE client_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE client_transactions ADD COLUMN IF NOT EXISTS expense_category TEXT;
ALTER TABLE client_transactions ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- Ensure clients table has financial_balance column
ALTER TABLE clients ADD COLUMN IF NOT EXISTS financial_balance NUMERIC(12, 2) DEFAULT 0;

-- 3. Indexes for fast retrieval by user, client, case, and date
CREATE INDEX IF NOT EXISTS idx_client_tx_user_id ON client_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_client_tx_client_id ON client_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tx_case_id ON client_transactions(case_id);
CREATE INDEX IF NOT EXISTS idx_client_tx_date ON client_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_client_tx_type ON client_transactions(type);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE client_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Multi-Tenant Policies for client_transactions
DO $$
BEGIN
  -- SELECT Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'client_transactions' AND policyname = 'Users can view own transactions'
  ) THEN
    CREATE POLICY "Users can view own transactions"
      ON client_transactions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- INSERT Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'client_transactions' AND policyname = 'Users can insert own transactions'
  ) THEN
    CREATE POLICY "Users can insert own transactions"
      ON client_transactions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- UPDATE Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'client_transactions' AND policyname = 'Users can update own transactions'
  ) THEN
    CREATE POLICY "Users can update own transactions"
      ON client_transactions FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  -- DELETE Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'client_transactions' AND policyname = 'Users can delete own transactions'
  ) THEN
    CREATE POLICY "Users can delete own transactions"
      ON client_transactions FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
