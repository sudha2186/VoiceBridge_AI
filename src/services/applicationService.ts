import { supabase } from './supabaseClient';
import type { Scheme } from './schemeService';
import type { Profile } from './profileService';
import type { DocumentRecord } from './documentService';
import { generateApplicationPdf } from './pdfService';
import { calculateAge } from '@/utils/ageUtils';

// Application shape mirrors the live `applications` table in Supabase.
export interface ApplicationRecord {
  id: string;
  user_id: string;
  scheme_id: string | null;
  status: string;
  form_data: {
    application_id?: string;
    profile_snapshot?: Partial<Profile> & { age?: number | null };
    scheme_id?: string;
    scheme_name?: string;
    pdf_filename?: string;
    generated_at?: string;
    [key: string]: unknown;
  } | null;
  created_at?: string;
  updated_at?: string;
  scheme?: Scheme | null;
}

/**
 * Fetch all applications for the current user.
 */
export async function getApplications(userId: string): Promise<ApplicationRecord[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }

  // Populate scheme details from Schemes table where possible
  const apps = (data ?? []) as ApplicationRecord[];
  return apps;
}

/**
 * Create a new application record in the live Supabase `applications` table
 * and generate the downloadable PDF application form.
 */
export async function createApplication(
  userId: string,
  scheme: Scheme,
  profile: Profile,
  documents: DocumentRecord[] = [],
  customFormData?: Record<string, any>
): Promise<{ application: ApplicationRecord; pdfDoc: ReturnType<typeof generateApplicationPdf> }> {
  const applicationId = `APP-${Date.now().toString(36).toUpperCase()}`;
  const citizenAge = calculateAge(profile.date_of_birth) ?? profile.age;

  // 1. Generate the PDF document using jsPDF with official scheme particulars
  const pdfDoc = generateApplicationPdf(profile, scheme, documents, applicationId, customFormData);

  // 2. Prepare structured form_data snapshot adhering to live schema
  const formDataPayload = {
    application_id: applicationId,
    profile_snapshot: {
      full_name: profile.full_name,
      date_of_birth: profile.date_of_birth,
      age: citizenAge,
      gender: profile.gender,
      annual_income: profile.annual_income,
      occupation: profile.occupation,
      state: profile.state,
      district: profile.district,
      category: profile.category,
      phone: profile.phone,
    },
    scheme_particulars: customFormData || {},
    scheme_id: scheme.id,
    scheme_name: scheme.name || scheme.title,
    pdf_filename: `${applicationId}.pdf`,
    generated_at: new Date().toISOString(),
  };

  // 3. Insert application into Supabase applications table
  const { data, error: dbError } = await supabase
    .from('applications')
    .insert({
      user_id: userId,
      scheme_id: scheme.id,
      status: 'draft',
      form_data: formDataPayload,
    })
    .select()
    .single();

  if (dbError) {
    console.error('Error inserting application record:', dbError);
    throw dbError;
  }

  const appRecord = data as ApplicationRecord;
  appRecord.scheme = scheme;

  // 4. Trigger client-side direct download of the generated PDF
  try {
    pdfDoc.save(`${applicationId}_${(scheme.name || scheme.title || 'Scheme').replace(/\s+/g, '_')}.pdf`);
  } catch (downloadErr) {
    console.warn('PDF automatic download trigger warning:', downloadErr);
  }

  return { application: appRecord, pdfDoc };
}

/**
 * Delete an application record by ID.
 */
export async function deleteApplication(applicationId: string): Promise<void> {
  const { error } = await supabase.from('applications').delete().eq('id', applicationId);
  if (error) throw error;
}
