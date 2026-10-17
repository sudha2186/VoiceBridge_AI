/*
# Add occupation/age columns to profiles + expand schemes table

## Changes

### profiles table
- Add `occupation` (text) — citizen's occupation (farmer, student, etc.)
- Add `age` (integer) — citizen's age (used for age-range eligibility checks)

### schemes table
- Add `required_documents` (text[]) — list of documents needed to apply
- Add `official_link` (text) — URL to the official scheme website

## Security
- No policy changes. The existing owner-scoped RLS on profiles and the
  read-only authenticated SELECT on schemes remain in effect. New columns
  are covered by existing policies (column-level privileges are not restricted).

## Notes
1. `occupation` and `age` are nullable so existing profile rows are not broken.
2. `required_documents` is a text array for easy listing in the UI.
3. `official_link` lets the "Apply" button open the official portal.
*/

-- Add occupation and age to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'occupation') THEN
    ALTER TABLE profiles ADD COLUMN occupation text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'age') THEN
    ALTER TABLE profiles ADD COLUMN age integer;
  END IF;
END $$;

-- Add required_documents and official_link to schemes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schemes' AND column_name = 'required_documents') THEN
    ALTER TABLE schemes ADD COLUMN required_documents text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schemes' AND column_name = 'official_link') THEN
    ALTER TABLE schemes ADD COLUMN official_link text;
  END IF;
END $$;