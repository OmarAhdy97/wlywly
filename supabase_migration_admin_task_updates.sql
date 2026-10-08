-- ==============================================================================
-- MIGRATION: ADMINISTRATIVE TASK LIFECYCLE & AUDIT HISTORY
-- Table: admin_task_updates
-- Multi-tenancy isolation: auth.uid() = user_id
-- SAFE & NON-DESTRUCTIVE: Creates new table and policies without dropping anything
-- ==============================================================================

-- 1. Create table for tracking administrative task updates historically
CREATE TABLE IF NOT EXISTS admin_task_updates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_task_id TEXT NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
  case_id TEXT,
  action_type TEXT NOT NULL, -- 'created', 'status_changed', 'postponed', 'reassigned', 'due_date_changed', 'completed', 'reopened', 'cancelled', 'note_added'
  previous_status TEXT,
  new_status TEXT,
  previous_due_date DATE,
  new_due_date DATE,
  previous_assigned_to TEXT,
  new_assigned_to TEXT,
  update_text TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for fast retrieval by task, user/tenant, and case
CREATE INDEX IF NOT EXISTS idx_admin_task_updates_task_id ON admin_task_updates(admin_task_id);
CREATE INDEX IF NOT EXISTS idx_admin_task_updates_user_id ON admin_task_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_task_updates_case_id ON admin_task_updates(case_id);
CREATE INDEX IF NOT EXISTS idx_admin_task_updates_created_at ON admin_task_updates(created_at DESC);

-- 3. Row Level Security (RLS) ensuring strict multi-tenant isolation
ALTER TABLE admin_task_updates ENABLE ROW LEVEL SECURITY;

-- 4. Safe non-destructive policy creation (avoids DROP warnings in Supabase Editor)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_task_updates' AND policyname = 'Users can view own admin task updates'
  ) THEN
    CREATE POLICY "Users can view own admin task updates"
      ON admin_task_updates FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_task_updates' AND policyname = 'Users can insert own admin task updates'
  ) THEN
    CREATE POLICY "Users can insert own admin task updates"
      ON admin_task_updates FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_task_updates' AND policyname = 'Users can update own admin task updates'
  ) THEN
    CREATE POLICY "Users can update own admin task updates"
      ON admin_task_updates FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_task_updates' AND policyname = 'Users can delete own admin task updates'
  ) THEN
    CREATE POLICY "Users can delete own admin task updates"
      ON admin_task_updates FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
