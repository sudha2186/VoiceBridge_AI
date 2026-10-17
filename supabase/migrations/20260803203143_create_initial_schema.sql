/*
# AI Government Scheme Assistant — Initial Schema

Creates the core data tables for the application.

## Tables

1. `profiles` — extends `auth.users` with citizen-specific info (full name, phone, state, etc.).
   - One row per authenticated user, keyed on `auth.users.id`.
2. `schemes` — catalog of Indian government schemes (title, description, eligibility, ministry, category).
   - Seeded publicly-readable catalog; only service role writes, citizens read.
3. `applications` — a citizen's saved application for a scheme (status, autofilled data JSON).
   - Owner-scoped to the authenticated citizen. Never auto-submitted.
4. `documents` — citizen-uploaded documents (type, filename, storage path).
   - Owner-scoped to the authenticated citizen.

## Security (RLS)

- `profiles`: each user reads/updates only their own profile row.
- `schemes`: publicly readable to authenticated users (catalog). Writes restricted to service role (no anon/authenticated insert/update/delete policy).
- `applications`: owner-scoped CRUD via `auth.uid() = user_id`.
- `documents`: owner-scoped CRUD via `auth.uid() = user_id`.

Owner columns (`applications.user_id`, `documents.user_id`) default to `auth.uid()` so client inserts that omit the column still satisfy the WITH CHECK.

## Notes

1. `profiles.id` is the primary key AND foreign key to `auth.users(id)`, so a profile cannot exist without an auth user.
2. `applications.form_data` is a JSONB column holding autofilled form fields (not built yet — placeholder for PDF generation).
3. `schemes.eligibility_criteria` is JSONB for structured eligibility rules (placeholder).
*/

-- =========================================================
-- profiles: one row per authenticated citizen
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  state text,
  district text,
  date_of_birth date,
  annual_income numeric,
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================================================
-- schemes: catalog of government schemes (read-only for citizens)
-- =========================================================
CREATE TABLE IF NOT EXISTS schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  ministry text,
  category text,
  eligibility_criteria jsonb,
  benefits text,
  how_to_apply text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;

-- Catalog is readable by authenticated users; writes are service-role only (no insert/update/delete policy)
DROP POLICY IF EXISTS "read_schemes" ON schemes;
CREATE POLICY "read_schemes" ON schemes FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- applications: a citizen's saved application for a scheme
-- =========================================================
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  scheme_id uuid REFERENCES schemes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  form_data jsonb,
  pdf_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_applications" ON applications;
CREATE POLICY "select_own_applications" ON applications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_applications" ON applications;
CREATE POLICY "insert_own_applications" ON applications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_applications" ON applications;
CREATE POLICY "update_own_applications" ON applications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_applications" ON applications;
CREATE POLICY "delete_own_applications" ON applications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- documents: citizen-uploaded documents
-- =========================================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_documents" ON documents;
CREATE POLICY "select_own_documents" ON documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_documents" ON documents;
CREATE POLICY "insert_own_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_documents" ON documents;
CREATE POLICY "update_own_documents" ON documents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_documents" ON documents;
CREATE POLICY "delete_own_documents" ON documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- Indexes for common queries
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_scheme_id ON applications(scheme_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_schemes_category ON schemes(category);