/**
 * VoiceBridge AI — Scheme-Specific Document Requirements Catalog
 * 
 * Provides verified official document requirements for government welfare schemes,
 * clearly distinguishing Required, Optional, and Conditionally Required documents,
 * along with official justifications, application stage (now vs later), and criteria.
 */

export interface SchemeDocumentRequirement {
  name: string;
  status: 'required' | 'optional' | 'conditional';
  reason: string;
  stage: 'now' | 'later';
  condition?: string;
}

export const SCHEME_DOCUMENT_CATALOG: Record<string, SchemeDocumentRequirement[]> = {
  // 1. National Scholarship Support Scheme
  'National Scholarship Support Scheme': [
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Mandatory primary citizen identity proof for Direct Benefit Transfer (DBT).',
      stage: 'now',
    },
    {
      name: 'Student ID / Bonafide Certificate',
      status: 'required',
      reason: 'Official verification of current enrollment in a recognized educational institution.',
      stage: 'now',
    },
    {
      name: 'Bank Passbook',
      status: 'required',
      reason: 'DBT-linked bank account for direct scholarship disbursement.',
      stage: 'now',
    },
    {
      name: 'Previous Academic Marksheet',
      status: 'optional',
      reason: 'Verification of academic merit score (minimum 50% marks).',
      stage: 'later',
    },
    {
      name: 'Income Certificate',
      status: 'conditional',
      reason: 'Required for merit-cum-means category (Parent/Guardian certificate accepted for students).',
      stage: 'now',
      condition: 'Required if family income is under ₹2,50,000 threshold.',
    },
    {
      name: 'Caste Certificate',
      status: 'conditional',
      reason: 'Proof of affirmative category for SC/ST/OBC scholarship reservation quotas.',
      stage: 'now',
      condition: 'Required only if applying under reserved category quota.',
    },
  ],

  // 2. Kisan Income Assistance Scheme (PM-KISAN)
  'Kisan Income Assistance Scheme': [
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Primary biometric identity proof for farmer registration.',
      stage: 'now',
    },
    {
      name: 'Land Record (7/12 / Khasra / Khata)',
      status: 'required',
      reason: 'Proof of cultivable agricultural landholding in applicant farmer name.',
      stage: 'now',
    },
    {
      name: 'Bank Passbook',
      status: 'required',
      reason: 'Aadhaar-seeded bank account for quarterly ₹2,000 DBT installments.',
      stage: 'now',
    },
    {
      name: 'Mobile Linked Aadhaar OTP Verification',
      status: 'optional',
      reason: 'Fast-track e-KYC authentication on pmkisan.gov.in portal.',
      stage: 'later',
    },
  ],

  // 3. Pradhan Mantri Awas Support Scheme (PMAY)
  'Pradhan Mantri Awas Support Scheme': [
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Identity proof for all adult family members in beneficiary household.',
      stage: 'now',
    },
    {
      name: 'Income Certificate',
      status: 'required',
      reason: 'Verification of EWS (≤ ₹3 Lakh) or LIG (≤ ₹6 Lakh) household income ceiling.',
      stage: 'now',
    },
    {
      name: 'Bank Passbook',
      status: 'required',
      reason: 'DBT bank account for construction subsidy milestone transfers.',
      stage: 'now',
    },
    {
      name: 'Affidavit of No Pucca House',
      status: 'optional',
      reason: 'Self-declaration confirming family does not own a pucca house anywhere in India.',
      stage: 'later',
    },
    {
      name: 'Caste Certificate',
      status: 'conditional',
      reason: 'Priority allocation for SC/ST/Minority beneficiaries under PMAY guidelines.',
      stage: 'now',
      condition: 'Required if claiming reservation priority under SC/ST housing quota.',
    },
  ],

  // 4. Women Entrepreneurship Support Scheme
  'Women Entrepreneurship Support Scheme': [
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Verification of female applicant identity and citizenship.',
      stage: 'now',
    },
    {
      name: 'Udyam Registration / Enterprise Proof',
      status: 'required',
      reason: 'Official MSME enterprise registration certificate showing 51%+ female ownership.',
      stage: 'now',
    },
    {
      name: 'Bank Passbook / Current Account',
      status: 'required',
      reason: 'Business bank account for credit subsidy and working capital sanction.',
      stage: 'now',
    },
    {
      name: 'Project Business Plan',
      status: 'optional',
      reason: 'Detailed project summary for bank loan appraisal above ₹5 Lakh.',
      stage: 'later',
    },
    {
      name: 'Caste Certificate',
      status: 'conditional',
      reason: 'Special concession under Stand-Up India for SC/ST women entrepreneurs.',
      stage: 'now',
      condition: 'Required if seeking concessional interest under SC/ST category.',
    },
  ],

  // 5. Youth Skill Development Scheme (PMKVY)
  'Youth Skill Development Scheme': [
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Age verification (18 to 35 years) and biometric attendance at training centre.',
      stage: 'now',
    },
    {
      name: 'Educational Marksheet (10th / 12th)',
      status: 'required',
      reason: 'Proof of minimum educational qualification for selected skill job role.',
      stage: 'now',
    },
    {
      name: 'Bank Passbook',
      status: 'required',
      reason: 'Disbursement of monetary certification reward upon successful assessment.',
      stage: 'now',
    },
    {
      name: 'Disability Certificate',
      status: 'conditional',
      reason: 'Conveyance allowance and dedicated trainer support for Divyangjan trainees.',
      stage: 'now',
      condition: 'Required if seeking disability-specific training accommodations.',
    },
  ],

  // 6. Rural Employment Assistance Scheme (MGNREGA)
  'Rural Employment Assistance Scheme': [
    {
      name: 'MGNREGA Job Card',
      status: 'required',
      reason: 'Official registered household job card issued by Gram Panchayat.',
      stage: 'now',
    },
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Aadhaar-based wage payment system (ABPS) verification.',
      stage: 'now',
    },
    {
      name: 'Bank / Post Office Account Passbook',
      status: 'required',
      reason: 'Mandatory direct account for 100-day wage payments.',
      stage: 'now',
    },
  ],

  // 7. Senior Citizen Support Scheme (IGNOAPS)
  'Senior Citizen Support Scheme': [
    {
      name: 'Aadhaar Card with Full Date of Birth',
      status: 'required',
      reason: 'Official age verification confirming applicant is 60 years or older.',
      stage: 'now',
    },
    {
      name: 'Income Certificate / BPL Ration Card',
      status: 'required',
      reason: 'Verification of destitute or Below Poverty Line economic status.',
      stage: 'now',
    },
    {
      name: 'Bank / Post Office Passbook',
      status: 'required',
      reason: 'Direct monthly pension credit into senior citizen savings account.',
      stage: 'now',
    },
    {
      name: 'Disability Certificate',
      status: 'conditional',
      reason: 'Entitlement to higher pension rate for senior citizens with 80%+ disability.',
      stage: 'now',
      condition: 'Required if claiming enhanced severe disability pension.',
    },
  ],

  // 8. Farmer Crop Insurance Scheme (PMFBY)
  'Farmer Crop Insurance Scheme': [
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Identification of insured farmer.',
      stage: 'now',
    },
    {
      name: 'Land Possession / Sowing Certificate',
      status: 'required',
      reason: 'Official Patwari / Talathi certificate verifying notified crop sown on parcel.',
      stage: 'now',
    },
    {
      name: 'Bank Passbook / Kisan Credit Card',
      status: 'required',
      reason: 'Account for premium debit and fast-track crop damage claim payout.',
      stage: 'now',
    },
    {
      name: 'Tenancy / Lease Agreement',
      status: 'conditional',
      reason: 'Legal proof of cultivation rights for tenant or sharecropper farmers.',
      stage: 'now',
      condition: 'Required only for non-owner tenant farmers.',
    },
  ],

  // 9. Girl Child Education Scholarship
  'Girl Child Education Scholarship': [
    {
      name: 'Girl Child Aadhaar Card or Birth Certificate',
      status: 'required',
      reason: 'Verification of female gender and eligible student age (under 18).',
      stage: 'now',
    },
    {
      name: 'School / College Bonafide Certificate',
      status: 'required',
      reason: 'Proof of active admission and regular attendance in recognized institution.',
      stage: 'now',
    },
    {
      name: 'Parent / Guardian Aadhaar & Bank Passbook',
      status: 'required',
      reason: 'Joint savings account with parent/guardian for minor girl child DBT benefit.',
      stage: 'now',
    },
    {
      name: 'Parent / Guardian Income Certificate',
      status: 'optional',
      reason: 'Verification of economic means (parent/guardian certificate accepted).',
      stage: 'later',
    },
    {
      name: 'Caste Certificate',
      status: 'conditional',
      reason: 'Affirmative category scholarship quota verification.',
      stage: 'now',
      condition: 'Required if applying under SC/ST/OBC reservation quotas.',
    },
  ],

  // 10. Startup Seed Assistance Scheme
  'Startup Seed Assistance Scheme': [
    {
      name: 'DPIIT Startup Recognition Certificate',
      status: 'required',
      reason: 'Official recognition under Startup India initiative.',
      stage: 'now',
    },
    {
      name: 'Entity PAN Card',
      status: 'required',
      reason: 'Mandatory commercial tax identifier for legal incorporated startup entity.',
      stage: 'now',
    },
    {
      name: 'Current Bank Account Statement',
      status: 'required',
      reason: 'Seed grant disbursement and financial audit trail.',
      stage: 'now',
    },
    {
      name: 'Pitch Deck & Proof of Concept',
      status: 'optional',
      reason: 'Prototype demonstration for incubator screening committee.',
      stage: 'later',
    },
  ],

  // 11. Rural Women Self Help Scheme
  'Rural Women Self Help Scheme': [
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Identity verification for female SHG member.',
      stage: 'now',
    },
    {
      name: 'SHG Member Passbook / Group ID',
      status: 'required',
      reason: 'Proof of active membership in a registered Deendayal Antyodaya NRLM group.',
      stage: 'now',
    },
    {
      name: 'SHG Savings Account Passbook',
      status: 'required',
      reason: 'Revolving fund and community investment support transfer.',
      stage: 'now',
    },
  ],

  // 12. Student Education Loan Support Scheme
  'Student Education Loan Support Scheme': [
    {
      name: 'Admission Offer Letter & Fee Schedule',
      status: 'required',
      reason: 'Official proof of securing admission in approved higher education course.',
      stage: 'now',
    },
    {
      name: 'Student Aadhaar Card',
      status: 'required',
      reason: 'Primary borrower identity verification.',
      stage: 'now',
    },
    {
      name: 'Parent / Guardian Income Certificate or Salary Slip',
      status: 'required',
      reason: 'Household repayment capacity assessment (co-borrower requirement).',
      stage: 'now',
    },
    {
      name: '10th & 12th Academic Marksheets',
      status: 'required',
      reason: 'Verification of academic merit eligibility.',
      stage: 'now',
    },
    {
      name: 'PAN Card (Student or Co-Borrower)',
      status: 'optional',
      reason: 'Requested if available for credit bureau bureau reporting; does not block initial application.',
      stage: 'later',
    },
  ],

  // 13. Small Business Credit Support Scheme (MUDRA)
  'Small Business Credit Support Scheme': [
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Primary identity and residence proof of micro-entrepreneur.',
      stage: 'now',
    },
    {
      name: 'Business Address & Quotation for Machinery / Stock',
      status: 'required',
      reason: 'Purpose-of-loan verification for Shishu / Kishore / Tarun credit loan.',
      stage: 'now',
    },
    {
      name: 'Bank Passbook / Statement (6 Months)',
      status: 'required',
      reason: 'Credit appraisal and loan disbursement account.',
      stage: 'now',
    },
    {
      name: 'PAN Card',
      status: 'optional',
      reason: 'Requested if confirmed available; not mandatory for micro loans below ₹50,000.',
      stage: 'now',
    },
    {
      name: 'Caste Certificate',
      status: 'conditional',
      reason: 'Concessional processing for SC/ST/OBC entrepreneurs under credit guarantee fund.',
      stage: 'now',
      condition: 'Required if seeking concessional processing fees under reserved categories.',
    },
  ],

  // 14. Disability Assistance Scheme
  'Disability Assistance Scheme': [
    {
      name: 'Unique Disability ID (UDID) / Disability Certificate',
      status: 'required',
      reason: 'Official medical board certificate establishing 40%+ benchmark disability.',
      stage: 'now',
    },
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Identity proof of Divyangjan applicant.',
      stage: 'now',
    },
    {
      name: 'Bank Passbook',
      status: 'required',
      reason: 'Direct monthly assistive pension or aid disbursement.',
      stage: 'now',
    },
    {
      name: 'Income Certificate',
      status: 'optional',
      reason: 'Income ceiling proof for specialized motorized assistive aids.',
      stage: 'later',
    },
  ],

  // 15. Clean Energy Subsidy Scheme (PM Surya Ghar)
  'Clean Energy Subsidy Scheme': [
    {
      name: 'Electricity Consumer Bill',
      status: 'required',
      reason: 'Shows DISCOM consumer account number and connected sanctioned load.',
      stage: 'now',
    },
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Owner identity matching the electricity connection records.',
      stage: 'now',
    },
    {
      name: 'Bank Passbook',
      status: 'required',
      reason: 'Direct DBT subsidy credit upon commissioning and net-meter installation.',
      stage: 'now',
    },
    {
      name: 'Roof Rights / Property Ownership Document',
      status: 'optional',
      reason: 'Confirms structural roof availability for solar rooftop installation.',
      stage: 'later',
    },
  ],

  // 16. Agricultural Equipment Assistance Scheme (SMAM)
  'Agricultural Equipment Assistance Scheme': [
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Farmer identification and single-subsidy verification.',
      stage: 'now',
    },
    {
      name: 'Land Record (7/12 Extract / 8A)',
      status: 'required',
      reason: 'Confirms agricultural land size for eligible tractor / implement subsidy.',
      stage: 'now',
    },
    {
      name: 'Proforma Invoice / Dealer Quotation',
      status: 'required',
      reason: 'Price quotation from government-empanelled agricultural machinery manufacturer.',
      stage: 'now',
    },
    {
      name: 'Bank Passbook',
      status: 'required',
      reason: 'DBT transfer of equipment purchase subsidy.',
      stage: 'now',
    },
    {
      name: 'Caste Certificate',
      status: 'conditional',
      reason: 'Enhanced subsidy rate (50% vs 40%) for SC/ST and small/marginal farmers.',
      stage: 'now',
      condition: 'Required for special 50% subsidy concession for SC/ST farmers.',
    },
  ],

  // 17. Digital Literacy Mission (PMGDISHA)
  'Digital Literacy Mission': [
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Biometric verification ensuring one digitally literate person per eligible rural household.',
      stage: 'now',
    },
    {
      name: 'Student ID / Village Domicile Proof',
      status: 'optional',
      reason: 'Verification of rural residence and age (14 to 60 years).',
      stage: 'later',
    },
  ],

  // 18. Urban Livelihood Support Scheme (DAY-NULM)
  'Urban Livelihood Support Scheme': [
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Identification of urban poor citizen.',
      stage: 'now',
    },
    {
      name: 'Urban Domicile / Ration Card / Urban Address Proof',
      status: 'required',
      reason: 'Proof of residence in statutory town / municipal corporation area.',
      stage: 'now',
    },
    {
      name: 'Bank Passbook',
      status: 'required',
      reason: 'Subsidized loan interest credit and self-employment grant account.',
      stage: 'now',
    },
    {
      name: 'Urban Street Vendor ID / Vending Certificate',
      status: 'conditional',
      reason: 'Required for street vendor micro-credit loans under PM SVANidhi linkage.',
      stage: 'now',
      condition: 'Required if applying specifically under urban street vendor category.',
    },
  ],

  // 19. Maternal Health Assistance Scheme (PMMVY)
  'Maternal Health Assistance Scheme': [
    {
      name: 'Mother and Child Protection (MCP) Card',
      status: 'required',
      reason: 'Official registration with Anganwadi / Health Centre showing ANC check-ups.',
      stage: 'now',
    },
    {
      name: 'Pregnant Mother Aadhaar Card',
      status: 'required',
      reason: 'Direct verification of pregnant mother identity.',
      stage: 'now',
    },
    {
      name: 'Bank Passbook (Individual Mother Account)',
      status: 'required',
      reason: 'DBT installments (₹5,000 in stages) credited exclusively to mother bank account.',
      stage: 'now',
    },
    {
      name: 'Husband Aadhaar Card',
      status: 'optional',
      reason: 'Secondary identity record; absence does not disqualify single or widowed mothers.',
      stage: 'later',
    },
  ],

  // 20. Artisan Development Assistance Scheme (PM Vishwakarma)
  'Artisan Development Assistance Scheme': [
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Biometric e-KYC verification for traditional artisan/craftsperson.',
      stage: 'now',
    },
    {
      name: 'Traditional Artisan Trade Verification Proof',
      status: 'required',
      reason: 'Gram Panchayat or ULB verification confirming engagement in 1 of 18 trades.',
      stage: 'now',
    },
    {
      name: 'Bank Passbook',
      status: 'required',
      reason: 'Disbursement of ₹15,000 toolkit incentive and collateral-free loan.',
      stage: 'now',
    },
    {
      name: 'Prior Skill Training Certificate',
      status: 'optional',
      reason: 'Fast-track RPL certification exemption.',
      stage: 'later',
    },
  ],
};

/**
 * Returns the scheme-specific document requirements for a scheme.
 * Falls back to sensible default requirements if not explicitly mapped.
 */
export function getSchemeDocumentRequirements(schemeName: string): SchemeDocumentRequirement[] {
  // Direct match
  if (SCHEME_DOCUMENT_CATALOG[schemeName]) {
    return SCHEME_DOCUMENT_CATALOG[schemeName];
  }

  // Substring match
  for (const [key, reqs] of Object.entries(SCHEME_DOCUMENT_CATALOG)) {
    if (schemeName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(schemeName.toLowerCase())) {
      return reqs;
    }
  }

  // Sensible default: Aadhaar (required identity), Bank passbook (required DBT), Income cert (optional unless income rule)
  return [
    {
      name: 'Aadhaar Card',
      status: 'required',
      reason: 'Standard citizen identity verification for government welfare benefits.',
      stage: 'now',
    },
    {
      name: 'Bank Passbook',
      status: 'required',
      reason: 'DBT-linked bank account for benefit transfer.',
      stage: 'now',
    },
    {
      name: 'Income Certificate',
      status: 'optional',
      reason: 'May be required if scheme has income ceiling criteria.',
      stage: 'now',
    },
  ];
}
