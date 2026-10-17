import { jsPDF } from 'jspdf';
import type { Profile } from './profileService';
import type { Scheme } from './schemeService';
import type { DocumentRecord } from './documentService';
import { calculateAge } from '@/utils/ageUtils';

/**
 * Generate a PDF application form containing the citizen's verified profile data,
 * the selected scheme details, application ID, disclaimer, and timestamp.
 * Returns the jsPDF instance.
 */
export function generateApplicationPdf(
  profile: Profile,
  scheme: Scheme,
  documents: DocumentRecord[] = [],
  applicationId: string,
  customFormData?: Record<string, any>
): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 50) {
      doc.addPage();
      y = margin;
    }
  };

  // Dynamic age calculation from DOB
  const citizenAge = calculateAge(profile.date_of_birth) ?? profile.age;

  // ---------- Header band ----------
  doc.setFillColor(24, 43, 73);
  doc.rect(0, 0, pageWidth, 75, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(scheme.ministry || 'Government of India', margin, 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Official Citizen Application: ${scheme.name || scheme.title}`, margin, 50);
  doc.setFontSize(8.5);
  doc.text('VoiceBridge AI — Assisted Welfare Scheme Portal Form Autofill', margin, 65);

  const timestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.setFontSize(9);
  doc.text(`Application ID: ${applicationId}`, pageWidth - margin, 32, { align: 'right' });
  doc.text(`Generated: ${timestamp}`, pageWidth - margin, 48, { align: 'right' });
  doc.text(`Status: PREPARED DRAFT`, pageWidth - margin, 64, { align: 'right' });

  y = 100;

  // ---------- 1. Scheme Details ----------
  y = addSectionHeader(doc, '1. Scheme & Authority Particulars', margin, y, contentWidth, ensureSpace);
  y = addKeyValue(doc, 'Scheme Title', scheme.name || scheme.title, margin, y, contentWidth, ensureSpace);
  if (scheme.ministry) y = addKeyValue(doc, 'Nodal Ministry', scheme.ministry, margin, y, contentWidth, ensureSpace);
  if (scheme.category || scheme.scheme_type) {
    y = addKeyValue(doc, 'Scheme Category', (scheme.category || scheme.scheme_type)!, margin, y, contentWidth, ensureSpace);
  }
  if (scheme.state_applicable) y = addKeyValue(doc, 'Jurisdiction / Scope', scheme.state_applicable, margin, y, contentWidth, ensureSpace);
  if (scheme.official_url || scheme.official_link) {
    y = addKeyValue(doc, 'Official Portal URL', (scheme.official_url || scheme.official_link)!, margin, y, contentWidth, ensureSpace);
  }

  y += 10;

  // ---------- 2. Applicant Details (Exact Profile Fields) ----------
  y = addSectionHeader(doc, '2. Applicant Citizen Information (Verified Profile)', margin, y, contentWidth, ensureSpace);
  y = addKeyValue(doc, 'Full Name', profile.full_name ?? '—', margin, y, contentWidth, ensureSpace);
  y = addKeyValue(doc, 'Date of Birth (DOB)', profile.date_of_birth ?? '—', margin, y, contentWidth, ensureSpace);
  y = addKeyValue(doc, 'Calculated Age', citizenAge !== null ? `${citizenAge} years` : '—', margin, y, contentWidth, ensureSpace);
  y = addKeyValue(doc, 'Gender', profile.gender ?? '—', margin, y, contentWidth, ensureSpace);
  y = addKeyValue(doc, 'Domicile State', profile.state ?? '—', margin, y, contentWidth, ensureSpace);
  y = addKeyValue(doc, 'District', profile.district ?? '—', margin, y, contentWidth, ensureSpace);
  y = addKeyValue(doc, 'Occupation', profile.occupation ?? '—', margin, y, contentWidth, ensureSpace);
  y = addKeyValue(
    doc,
    'Annual Family Income',
    profile.annual_income != null ? `Rs. ${profile.annual_income.toLocaleString('en-IN')}` : '—',
    margin,
    y,
    contentWidth,
    ensureSpace
  );
  y = addKeyValue(doc, 'Social Category', profile.category ?? '—', margin, y, contentWidth, ensureSpace);
  if (profile.phone) {
    y = addKeyValue(doc, 'Contact Mobile', profile.phone, margin, y, contentWidth, ensureSpace);
  }

  y += 10;

  // ---------- 3. Scheme-Specific Particulars ----------
  if (customFormData && Object.keys(customFormData).length > 0) {
    y = addSectionHeader(doc, '3. Scheme-Specific Particulars', margin, y, contentWidth, ensureSpace);
    for (const [k, v] of Object.entries(customFormData)) {
      if (v !== undefined && v !== null && v !== '') {
        const formattedKey = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        y = addKeyValue(doc, formattedKey, String(v), margin, y, contentWidth, ensureSpace);
      }
    }
    y += 10;
  }

  // ---------- 4. Documents Checklist ----------
  y = addSectionHeader(doc, '4. Attached Citizen Documents & Verification', margin, y, contentWidth, ensureSpace);
  if (documents.length > 0) {
    documents.forEach((d, idx) => {
      ensureSpace(16);
      y += 2;
      const verifiedTag = d.verification?.status === 'verified' ? '[VERIFIED]' : '[ATTACHED]';
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(9);
      doc.text(`${idx + 1}. [x] ${d.document_type} — ${d.file_name} ${verifiedTag}`, margin + 8, y + 10);
      y += 12;
    });
  } else {
    ensureSpace(16);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text('No documents uploaded yet. Please attach standard ID and income certificates.', margin + 8, y + 10);
    y += 14;
  }

  y += 14;

  // ---------- 5. Declaration & Submission Notice ----------
  y = addSectionHeader(doc, '5. Citizen Declaration & Official Submission Instructions', margin, y, contentWidth, ensureSpace);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(8.5);

  const notice =
    'IMPORTANT NOTICE: This application form has been generated for verification and preparation assistance using VoiceBridge AI. ' +
    'Generating this PDF does NOT constitute official submission to the government portal. The applicant must submit this form and ' +
    `required documents via the official portal (${scheme.official_url || 'https://india.gov.in'}) or at the relevant designated government office.`;

  const wrappedNotice = doc.splitTextToSize(notice, contentWidth);
  ensureSpace(wrappedNotice.length * 12 + 15);
  doc.text(wrappedNotice, margin, y);
  y += wrappedNotice.length * 12 + 15;

  const declaration =
    'Applicant Declaration: I hereby declare that the particulars furnished above are true and complete to the best of my knowledge and belief.';
  const wrappedDecl = doc.splitTextToSize(declaration, contentWidth);
  ensureSpace(wrappedDecl.length * 12 + 25);
  doc.text(wrappedDecl, margin, y);
  y += wrappedDecl.length * 12 + 35;

  // ---------- Signature line ----------
  ensureSpace(40);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, margin + 180, y);
  doc.setFontSize(9);
  doc.text('Signature of Applicant', margin, y + 15);

  // ---------- Footer on every page ----------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('VoiceBridge AI — Multilingual Citizen Welfare Scheme Assistant', margin, pageHeight - 18);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 18, { align: 'right' });
  }

  return doc;
}

function addSectionHeader(
  doc: jsPDF,
  title: string,
  x: number,
  y: number,
  width: number,
  ensureSpace: (n: number) => void
): number {
  ensureSpace(30);
  doc.setFillColor(237, 242, 255);
  doc.roundedRect(x, y, width, 22, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 58, 138);
  doc.text(title, x + 8, y + 15);
  return y + 30;
}

function addKeyValue(
  doc: jsPDF,
  key: string,
  value: string,
  x: number,
  y: number,
  width: number,
  ensureSpace: (n: number) => void
): number {
  const valueWrapped = doc.splitTextToSize(value, width * 0.65);
  const lineHeight = 12;
  const blockHeight = Math.max(lineHeight, valueWrapped.length * lineHeight);
  ensureSpace(blockHeight + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(key, x, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(valueWrapped, x + width * 0.32, y + 9);

  return y + blockHeight + 3;
}
