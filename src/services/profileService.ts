import { supabase } from './supabaseClient';

export interface Profile {
  id: string;
  user_id?: string | null;
  full_name: string | null;
  phone: string | null;
  state: string | null;
  district: string | null;
  date_of_birth: string | null;
  annual_income: number | null;
  has_personal_income?: boolean | null;
  guardian_income?: number | null;
  income_source?: 'personal' | 'father' | 'mother' | 'legal_guardian' | 'family' | string | null;
  category: string | null;
  gender: string | null;
  occupation: string | null;
  disability_status?: 'Yes' | 'No' | 'Prefer not to say' | string | null;
  age: number | null;
  created_at?: string;
  updated_at?: string;
}

// Fetch the profile for the currently signed-in user.
// Merges local extended metadata (guardian income, income source, disability) to comply with live Supabase schema.
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) return null;

  const storedDisability = localStorage.getItem(`voicebridge_disability_${userId}`);
  const storedExt = localStorage.getItem(`voicebridge_ext_${userId}`);
  let extData: { has_personal_income?: boolean | null; guardian_income?: number | null; income_source?: string | null } = {};
  if (storedExt) {
    try {
      extData = JSON.parse(storedExt);
    } catch {
      // ignore
    }
  }

  return {
    ...data,
    disability_status: storedDisability || null,
    has_personal_income: extData.has_personal_income ?? null,
    guardian_income: extData.guardian_income ?? null,
    income_source: extData.income_source ?? null,
  } as Profile;
}

// Create a profile row for the current user (called after signup).
export async function createProfile(
  userId: string,
  fields: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
): Promise<Profile> {
  const { disability_status, has_personal_income, guardian_income, income_source, ...supabaseFields } = fields;

  if (disability_status !== undefined) {
    localStorage.setItem(`voicebridge_disability_${userId}`, disability_status || '');
  }
  const extData = { has_personal_income, guardian_income, income_source };
  localStorage.setItem(`voicebridge_ext_${userId}`, JSON.stringify(extData));

  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, ...supabaseFields })
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    disability_status: disability_status || null,
    has_personal_income: has_personal_income ?? null,
    guardian_income: guardian_income ?? null,
    income_source: income_source ?? null,
  } as Profile;
}

// Update the current user's profile fields.
export async function updateProfile(
  userId: string,
  fields: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
): Promise<Profile> {
  const { disability_status, has_personal_income, guardian_income, income_source, ...supabaseFields } = fields;

  if (disability_status !== undefined) {
    localStorage.setItem(`voicebridge_disability_${userId}`, disability_status || '');
  }

  // Preserve existing extended values if not provided
  let existingExt = {};
  try {
    const raw = localStorage.getItem(`voicebridge_ext_${userId}`);
    if (raw) existingExt = JSON.parse(raw);
  } catch {
    // ignore
  }

  const updatedExt = {
    ...existingExt,
    ...(has_personal_income !== undefined ? { has_personal_income } : {}),
    ...(guardian_income !== undefined ? { guardian_income } : {}),
    ...(income_source !== undefined ? { income_source } : {}),
  };
  localStorage.setItem(`voicebridge_ext_${userId}`, JSON.stringify(updatedExt));

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...supabaseFields, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  const currentDisability = disability_status !== undefined
    ? disability_status
    : localStorage.getItem(`voicebridge_disability_${userId}`) || null;

  return {
    ...data,
    disability_status: currentDisability,
    has_personal_income: updatedExt.has_personal_income ?? null,
    guardian_income: updatedExt.guardian_income ?? null,
    income_source: updatedExt.income_source ?? null,
  } as Profile;
}
