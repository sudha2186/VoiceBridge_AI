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
  category: string | null;
  gender: string | null;
  occupation: string | null;
  disability_status?: 'Yes' | 'No' | 'Prefer not to say' | string | null;
  age: number | null;
  created_at?: string;
  updated_at?: string;
}

// Fetch the profile for the currently signed-in user.
// Merges local disability_status persistence to comply with live Supabase schema.
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
  return {
    ...data,
    disability_status: storedDisability || null,
  } as Profile;
}

// Create a profile row for the current user (called after signup).
export async function createProfile(
  userId: string,
  fields: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
): Promise<Profile> {
  const { disability_status, ...supabaseFields } = fields;

  if (disability_status !== undefined) {
    localStorage.setItem(`voicebridge_disability_${userId}`, disability_status || '');
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, ...supabaseFields })
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    disability_status: disability_status || null,
  } as Profile;
}

// Update the current user's profile fields.
export async function updateProfile(
  userId: string,
  fields: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
): Promise<Profile> {
  const { disability_status, ...supabaseFields } = fields;

  if (disability_status !== undefined) {
    localStorage.setItem(`voicebridge_disability_${userId}`, disability_status || '');
  }

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
  } as Profile;
}
