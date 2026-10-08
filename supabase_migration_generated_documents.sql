-- ==============================================================================
-- MIGRATION: LEGAL DOCUMENTS GENERATOR & AUDIT PERSISTENCE
-- Tables: generated_documents, generated_document_versions
-- Multi-tenancy isolation: auth.uid() = user_id
-- SAFE & NON-DESTRUCTIVE: Creates new tables and RLS policies cleanly
-- ==============================================================================

-- 1. Create table for generated documents (Snapshots)
CREATE TABLE IF NOT EXISTS generated_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT,
  formula_id TEXT NOT NULL,
  case_id TEXT,
  client_id TEXT,
  title TEXT NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  field_values JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft', -- 'draft', 'final', 'archived'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create table for document version history (Optional revision tracking)
CREATE TABLE IF NOT EXISTS generated_document_versions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for fast retrieval by user, case, client, and date
CREATE INDEX IF NOT EXISTS idx_generated_docs_user_id ON generated_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_case_id ON generated_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_client_id ON generated_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_formula_id ON generated_documents(formula_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_created_at ON generated_documents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gen_doc_versions_doc_id ON generated_document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_gen_doc_versions_user_id ON generated_document_versions(user_id);

-- 4. Enable Row Level Security (RLS) on both tables
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_document_versions ENABLE ROW LEVEL SECURITY;

-- 5. Strict Multi-Tenant Policies for generated_documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'generated_documents' AND policyname = 'Users can view own generated documents'
  ) THEN
    CREATE POLICY "Users can view own generated documents"
      ON generated_documents FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'generated_documents' AND policyname = 'Users can insert own generated documents'
  ) THEN
    CREATE POLICY "Users can insert own generated documents"
      ON generated_documents FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'generated_documents' AND policyname = 'Users can update own generated documents'
  ) THEN
    CREATE POLICY "Users can update own generated documents"
      ON generated_documents FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'generated_documents' AND policyname = 'Users can delete own generated documents'
  ) THEN
    CREATE POLICY "Users can delete own generated documents"
      ON generated_documents FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 6. Strict Multi-Tenant Policies for generated_document_versions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'generated_document_versions' AND policyname = 'Users can view own document versions'
  ) THEN
    CREATE POLICY "Users can view own document versions"
      ON generated_document_versions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'generated_document_versions' AND policyname = 'Users can insert own document versions'
  ) THEN
    CREATE POLICY "Users can insert own document versions"
      ON generated_document_versions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'generated_document_versions' AND policyname = 'Users can delete own document versions'
  ) THEN
    CREATE POLICY "Users can delete own document versions"
      ON generated_document_versions FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
