/*
# Add extracted_data + file_size columns to documents + create storage bucket

## Changes

### documents table
- Add `extracted_data` (jsonb) — stores mock OCR extracted fields (name, dob, address, income)
- Add `file_size` (bigint) — file size in bytes for display

### Storage
- Create `documents` storage bucket (private, per-user folder structure)
- Add storage policies: authenticated users can CRUD only their own folder (`user_id/`)

## Security
- Existing RLS policies on documents table remain in effect (owner-scoped CRUD).
- New columns are covered by existing policies.
- Storage policies enforce that a user can only read/write objects within
  their own `user_id/` prefix in the `documents` bucket.

## Notes
1. `extracted_data` is nullable so existing document rows are not broken.
2. `file_size` is nullable for the same reason.
3. The storage bucket is private — file access requires authenticated RLS check.
*/

-- Add extracted_data and file_size to documents
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'extracted_data') THEN
    ALTER TABLE documents ADD COLUMN extracted_data jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'file_size') THEN
    ALTER TABLE documents ADD COLUMN file_size bigint;
  END IF;
END $$;

-- Insert the storage bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can only manage objects in their own folder
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read own documents" ON storage.objects;
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);