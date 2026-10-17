/**
 * VoiceBridge AI — Official Government Scheme Application Form Definitions
 * Correlates real government schemes with official form fields, ministries,
 * application workflows, and multilingual prompts (EN, HI, MR).
 */

export interface SchemeFormField {
  key: string;
  label: { en: string; hi: string; mr: string };
  type: 'text' | 'number' | 'select' | 'tel';
  required: boolean;
  placeholder?: { en: string; hi: string; mr: string };
  options?: { value: string; label: { en: string; hi: string; mr: string } }[];
  validationRegex?: string;
  errorMessage?: { en: string; hi: string; mr: string };
  promptQuestion?: { en: string; hi: string; mr: string };
}

export interface OfficialSchemeFormConfig {
  schemeName: string;
  formCode: string;
  ministry: string;
  department: string;
  applicationMode: 'Online' | 'Offline' | 'Hybrid';
  officialPortalUrl: string;
  submissionGuidance: {
    en: string;
    hi: string;
    mr: string;
  };
  schemeSpecificFields: SchemeFormField[];
}

export const OFFICIAL_SCHEME_FORMS: Record<string, OfficialSchemeFormConfig> = {
  // 1. Kisan Income Assistance Scheme (PM-KISAN)
  'Kisan Income Assistance Scheme': {
    schemeName: 'Kisan Income Assistance Scheme (PM-KISAN)',
    formCode: 'PM-KISAN / Form 1 (Farmer Registration)',
    ministry: 'Ministry of Agriculture and Farmers Welfare',
    department: 'Department of Agriculture & Cooperation',
    applicationMode: 'Online',
    officialPortalUrl: 'https://pmkisan.gov.in',
    submissionGuidance: {
      en: 'Submit online at pmkisan.gov.in under New Farmer Registration, or visit your local Common Service Centre (CSC) / Agriculture Office with this generated draft.',
      hi: 'pmkisan.gov.in पर नए किसान पंजीकरण के तहत ऑनलाइन जमा करें, या इस प्रारूप के साथ निकटतम सीएससी / कृषि कार्यालय जाएं।',
      mr: 'pmkisan.gov.in वर नवीन शेतकरी नोंदणी अंतर्गत ऑनलाइन सबमिट करा किंवा या मसुद्यासह जवळच्या सीएससी / कृषी कार्यालयास भेट द्या.'
    },
    schemeSpecificFields: [
      {
        key: 'land_area_hectares',
        label: { en: 'Land Holding Area (Hectares)', hi: 'कृषि भूमि का क्षेत्रफल (हेक्टेयर)', mr: 'शेती जमिनीचे क्षेत्रफळ (हेक्टर)' },
        type: 'number',
        required: true,
        placeholder: { en: 'e.g. 1.5', hi: 'उदा. 1.5', mr: 'उदा. 1.5' },
        promptQuestion: {
          en: 'How many hectares of agricultural land do you own?',
          hi: 'आपके पास कितने हेक्टेयर कृषि भूमि है?',
          mr: 'तुमच्या मालकीची किती हेक्टर शेतजमीन आहे?'
        }
      },
      {
        key: 'khasra_khata_number',
        label: { en: 'Land Survey / Khata / Khasra No.', hi: 'खसरा / खाता संख्या / 7/12', mr: 'जमीन सर्व्हे / गट / ७/१२ क्रमांक' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. 142/A or 7/12 Khata 58', hi: 'उदा. 142/क या खाता 58', mr: 'उदा. १४२/अ किंवा गट क्र. ५८' },
        promptQuestion: {
          en: 'Please provide your land survey, khata, or 7/12 number.',
          hi: 'कृपया अपनी जमीन की खसरा या खाता संख्या बताएं।',
          mr: 'कृपया तुमचा जमीन सर्व्हे, गट किंवा ७/१२ क्रमांक सांगा.'
        }
      },
      {
        key: 'bank_account_number',
        label: { en: 'Bank Account Number (DBT Linked)', hi: 'बैंक खाता संख्या (डीबीटी लिंक)', mr: 'बँक खाते क्रमांक (डीबीटी लिंक)' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. 987654321012', hi: 'उदा. 987654321012', mr: 'उदा. ९८७६५४३२१०१२' },
        validationRegex: '^\\d{9,18}$',
        errorMessage: {
          en: 'Account number must be 9 to 18 digits.',
          hi: 'बैंक खाता 9 से 18 अंकों का होना चाहिए।',
          mr: 'बँक खाते क्रमांक ९ ते १८ अंकांचा असावा.'
        },
        promptQuestion: {
          en: 'What is your DBT-linked Bank Account Number?',
          hi: 'आपका डीबीटी से जुड़ा बैंक खाता नंबर क्या है?',
          mr: 'तुमचा डीबीटी लिंक केलेला बँक खाते क्रमांक काय आहे?'
        }
      },
      {
        key: 'bank_ifsc_code',
        label: { en: 'Bank IFSC Code', hi: 'बैंक आईएफएससी कोड', mr: 'बँक आयएफएससी कोड' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. SBIN0001234', hi: 'उदा. SBIN0001234', mr: 'उदा. SBIN0001234' },
        validationRegex: '^[A-Z]{4}0[A-Z0-9]{6}$',
        errorMessage: {
          en: 'Invalid IFSC code format (e.g. SBIN0001234).',
          hi: 'अमान्य आईएफएससी कोड (उदा. SBIN0001234)।',
          mr: 'अवैध आयएफएससी कोड (उदा. SBIN0001234).'
        },
        promptQuestion: {
          en: 'What is your bank branch IFSC Code?',
          hi: 'आपकी बैंक शाखा का आईएफएससी कोड क्या है?',
          mr: 'तुमच्या बँक शाखेचा आयएफएससी कोड काय आहे?'
        }
      }
    ]
  },

  // 2. National Scholarship Support Scheme
  'National Scholarship Support Scheme': {
    schemeName: 'National Scholarship Support Scheme (NSP)',
    formCode: 'NSP Unified Scholarship Application Form 2026',
    ministry: 'Ministry of Education',
    department: 'Department of Higher Education',
    applicationMode: 'Online',
    officialPortalUrl: 'https://scholarships.gov.in',
    submissionGuidance: {
      en: 'Complete biometric / OTP authentication at scholarships.gov.in. Upload institutional Bonafide Certificate alongside this verified draft.',
      hi: 'scholarships.gov.in पर बायोमेट्रिक / ओटीपी सत्यापन पूरा करें और इस प्रारूप के साथ कॉलेज बोनाफाइड प्रमाणपत्र अपलोड करें।',
      mr: 'scholarships.gov.in वर बायोमेट्रिक / ओटीपी प्रमाणीकरण पूर्ण करा आणि या मसुद्यासोबत कॉलेज बोनाफाइड प्रमाणपत्र अपलोड करा.'
    },
    schemeSpecificFields: [
      {
        key: 'institution_name',
        label: { en: 'School / College / Institution Name', hi: 'स्कूल / कॉलेज / संस्थान का नाम', mr: 'शाळा / महाविद्यालय / संस्थेचे नाव' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. Government Polytechnic / University of Mumbai', hi: 'उदा. राजकीय पॉलिटेक्निक', mr: 'उदा. शासकीय तंत्रनिकेतन' },
        promptQuestion: {
          en: 'Which school, college, or university are you currently attending?',
          hi: 'आप वर्तमान में किस स्कूल, कॉलेज या विश्वविद्यालय में अध्ययनरत हैं?',
          mr: 'तुम्ही सध्या कोणत्या शाळा, कॉलेज किंवा विद्यापीठात शिकत आहात?'
        }
      },
      {
        key: 'course_name',
        label: { en: 'Current Course & Year of Study', hi: 'वर्तमान पाठ्यक्रम एवं अध्ययन वर्ष', mr: 'सध्याचा अभ्यासक्रम आणि शैक्षणिक वर्ष' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. B.Tech Computer Engineering (2nd Year)', hi: 'उदा. बी.एससी द्वितीय वर्ष', mr: 'उदा. बी.कॉम द्वितीय वर्ष' },
        promptQuestion: {
          en: 'What course and year are you currently studying?',
          hi: 'आप किस कक्षा या पाठ्यक्रम में पढ़ रहे हैं?',
          mr: 'तुम्ही कोणत्या अभ्यासक्रमात आणि वर्षात शिकत आहात?'
        }
      },
      {
        key: 'student_roll_number',
        label: { en: 'Student Roll / Registration / PRN Number', hi: 'छात्र अनुक्रमांक / पंजीकरण संख्या', mr: 'विद्यार्थी रोल / पीआरएन क्रमांक' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. PRN-2024-00912', hi: 'उदा. 20240912', mr: 'उदा. PRN2024009' },
        promptQuestion: {
          en: 'What is your college roll or registration number?',
          hi: 'आपका रोल नंबर या पंजीकरण क्रमांक क्या है?',
          mr: 'तुमचा रोल नंबर किंवा नोंदणी क्रमांक काय आहे?'
        }
      },
      {
        key: 'bank_account_number',
        label: { en: 'Student Bank Account Number', hi: 'छात्र का बैंक खाता संख्या', mr: 'विद्यार्थ्याचे बँक खाते क्रमांक' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. 112233445566', hi: 'उदा. 112233445566', mr: 'उदा. ११२२३३४४५५६६' },
        validationRegex: '^\\d{9,18}$',
        promptQuestion: {
          en: 'What is your personal bank account number for scholarship disbursement?',
          hi: 'छात्रवृत्ति जमा करने हेतु आपका बैंक खाता नंबर क्या है?',
          mr: 'शिष्यवृत्ती जमा करण्यासाठी तुमचा बँक खाते क्रमांक काय आहे?'
        }
      },
      {
        key: 'bank_ifsc_code',
        label: { en: 'Bank IFSC Code', hi: 'बैंक आईएफएससी कोड', mr: 'बँक आयएफएससी कोड' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. MAHB0000123', hi: 'उदा. MAHB0000123', mr: 'उदा. MAHB0000123' },
        validationRegex: '^[A-Z]{4}0[A-Z0-9]{6}$',
        promptQuestion: {
          en: 'What is your bank branch IFSC Code?',
          hi: 'आपकी बैंक शाखा का आईएफएससी कोड क्या है?',
          mr: 'तुमच्या बँक शाखेचा आयएफएससी कोड काय आहे?'
        }
      }
    ]
  },

  // 3. Pradhan Mantri Awas Support Scheme (PMAY)
  'Pradhan Mantri Awas Support Scheme': {
    schemeName: 'Pradhan Mantri Awas Support Scheme (PMAY)',
    formCode: 'PMAY-Urban / Rural Beneficiary Application Form B',
    ministry: 'Ministry of Housing and Urban Affairs',
    department: 'Housing for All Mission',
    applicationMode: 'Online',
    officialPortalUrl: 'https://pmaymis.gov.in',
    submissionGuidance: {
      en: 'Submit through your local Municipal Ward Office / Gram Panchayat or online via pmaymis.gov.in.',
      hi: 'अपने नगर पालिका वार्ड कार्यालय / ग्राम पंचायत या pmaymis.gov.in पर ऑनलाइन जमा करें।',
      mr: 'तुमच्या स्थानिक नगरपालिका प्रभाग कार्यालय / ग्रामपंचायत किंवा pmaymis.gov.in वर ऑनलाइन सबमिट करा.'
    },
    schemeSpecificFields: [
      {
        key: 'current_housing_status',
        label: { en: 'Current Housing Status', hi: 'वर्तमान आवास की स्थिति', mr: 'सध्याच्या घराची स्थिती' },
        type: 'select',
        required: true,
        options: [
          { value: 'Kutcha House', label: { en: 'Kutcha / Temporary House', hi: 'कच्चा मकान', mr: 'कच्चे घर' } },
          { value: 'Rented', label: { en: 'Rented Accommodation', hi: 'किराये का मकान', mr: 'भाड्याचे घर' } },
          { value: 'Houseless', label: { en: 'Houseless / Homeless', hi: 'बेघर', mr: 'घर नसलेले / बेघर' } }
        ],
        promptQuestion: {
          en: 'What is your current housing status (Kutcha house, rented, or houseless)?',
          hi: 'आपके वर्तमान आवास की स्थिति क्या है (कच्चा मकान, किराये का, या बेघर)?',
          mr: 'तुमच्या सध्याच्या घराची स्थिती काय आहे (कच्चे घर, भाड्याचे घर, किंवा घर नसलेले)?'
        }
      },
      {
        key: 'ration_card_number',
        label: { en: 'BPL / Antyodaya Ration Card Number', hi: 'बीपीएल / अंत्योदय राशन कार्ड संख्या', mr: 'बीपीएल / अंत्योदय रेशन कार्ड क्रमांक' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. MH-27-BPL-10293', hi: 'उदा. MH-27-BPL-10293', mr: 'उदा. MH-27-BPL-10293' },
        promptQuestion: {
          en: 'What is your Ration Card number?',
          hi: 'आपका राशन कार्ड नंबर क्या है?',
          mr: 'तुमचा रेशन कार्ड क्रमांक काय आहे?'
        }
      },
      {
        key: 'bank_account_number',
        label: { en: 'Bank Account Number', hi: 'बैंक खाता संख्या', mr: 'बँक खाते क्रमांक' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. 556677889900', hi: 'उदा. 556677889900', mr: 'उदा. ५५६६७७८८९९००' },
        validationRegex: '^\\d{9,18}$',
        promptQuestion: {
          en: 'What is your Bank Account Number?',
          hi: 'आपका बैंक खाता नंबर क्या है?',
          mr: 'तुमचा बँक खाते क्रमांक काय आहे?'
        }
      },
      {
        key: 'bank_ifsc_code',
        label: { en: 'Bank IFSC Code', hi: 'बैंक आईएफएससी कोड', mr: 'बँक आयएफएससी कोड' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. BKID0001234', hi: 'उदा. BKID0001234', mr: 'उदा. BKID0001234' },
        validationRegex: '^[A-Z]{4}0[A-Z0-9]{6}$',
        promptQuestion: {
          en: 'What is your bank IFSC Code?',
          hi: 'आपकी बैंक शाखा का आईएफएससी कोड क्या है?',
          mr: 'तुमच्या बँक शाखेचा आयएफएससी कोड काय आहे?'
        }
      }
    ]
  },

  // 4. Senior Citizen Support Scheme
  'Senior Citizen Support Scheme': {
    schemeName: 'Senior Citizen Support Scheme (IGNOAPS)',
    formCode: 'National Social Assistance Programme — Form SC-1',
    ministry: 'Ministry of Social Justice and Empowerment',
    department: 'Department of Social Justice',
    applicationMode: 'Online',
    officialPortalUrl: 'https://socialjustice.gov.in',
    submissionGuidance: {
      en: 'Submit through your local Block Development Office (BDO) / Tehsildar Office or via socialjustice.gov.in.',
      hi: 'अपने स्थानीय खंड विकास अधिकारी (बीडीओ) / तहसीलदार कार्यालय या socialjustice.gov.in पर जमा करें।',
      mr: 'तुमच्या स्थानिक गट विकास अधिकारी (बीडीओ) / तहसीलदार कार्यालयात किंवा socialjustice.gov.in वर सबमिट करा.'
    },
    schemeSpecificFields: [
      {
        key: 'nominee_name',
        label: { en: 'Nominee Full Name', hi: 'नामित व्यक्ति (नॉमिनी) का नाम', mr: 'वारसदार (नॉमिनी) चे नाव' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. Sunita Sharma', hi: 'उदा. सुनीता शर्मा', mr: 'उदा. सुनिता पाटील' },
        promptQuestion: {
          en: 'What is your nominee\'s full name?',
          hi: 'आपके नामांकित व्यक्ति (नॉमिनी) का पूरा नाम क्या है?',
          mr: 'तुमच्या वारसदाराचे (नॉमिनी) पूर्ण नाव काय आहे?'
        }
      },
      {
        key: 'nominee_relation',
        label: { en: 'Nominee Relationship', hi: 'नॉमिनी से संबंध', mr: 'वारसदाराशी नाते' },
        type: 'select',
        required: true,
        options: [
          { value: 'Spouse', label: { en: 'Spouse (Wife/Husband)', hi: 'पति / पत्नी', mr: 'पती / पत्नी' } },
          { value: 'Son', label: { en: 'Son', hi: 'पुत्र', mr: 'मुलगा' } },
          { value: 'Daughter', label: { en: 'Daughter', hi: 'पुत्री', mr: 'मुलगी' } },
          { value: 'Other', label: { en: 'Other Relative', hi: 'अन्य रिश्तेदार', mr: 'इतर नातेवाईक' } }
        ],
        promptQuestion: {
          en: 'What is your relationship with the nominee?',
          hi: 'नॉमिनी से आपका क्या रिश्ता है?',
          mr: 'वारसदाराशी तुमचे नाते काय आहे?'
        }
      },
      {
        key: 'bank_account_number',
        label: { en: 'Pension Bank Account Number', hi: 'पेंशन बैंक खाता संख्या', mr: 'पेन्शन बँक खाते क्रमांक' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. 123456789012', hi: 'उदा. 123456789012', mr: 'उदा. १२३४५६७८९०१२' },
        validationRegex: '^\\d{9,18}$',
        promptQuestion: {
          en: 'What is your pension disbursement bank account number?',
          hi: 'पेंशन प्राप्ति के लिए आपका बैंक खाता नंबर क्या है?',
          mr: 'पेन्शन मिळण्यासाठी तुमचा बँक खाते क्रमांक काय आहे?'
        }
      },
      {
        key: 'bank_ifsc_code',
        label: { en: 'Bank IFSC Code', hi: 'बैंक आईएफएससी कोड', mr: 'बँक आयएफएससी कोड' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. SBIN0005555', hi: 'उदा. SBIN0005555', mr: 'उदा. SBIN0005555' },
        validationRegex: '^[A-Z]{4}0[A-Z0-9]{6}$',
        promptQuestion: {
          en: 'What is your bank branch IFSC Code?',
          hi: 'आपकी बैंक शाखा का आईएफएससी कोड क्या है?',
          mr: 'तुमच्या बँक शाखेचा आयएफएससी कोड काय आहे?'
        }
      }
    ]
  },

  // 5. Disability Assistance Scheme
  'Disability Assistance Scheme': {
    schemeName: 'Disability Assistance Scheme (Divyangjan)',
    formCode: 'Department of Empowerment of Persons with Disabilities — Form D-1',
    ministry: 'Ministry of Social Justice and Empowerment',
    department: 'Department of Empowerment of Persons with Disabilities',
    applicationMode: 'Online',
    officialPortalUrl: 'https://disabilityaffairs.gov.in',
    submissionGuidance: {
      en: 'Submit online at swavlambancard.gov.in or disabilityaffairs.gov.in. Attach certified UDID card with this form.',
      hi: 'swavlambancard.gov.in या disabilityaffairs.gov.in पर ऑनलाइन जमा करें। इस फॉर्म के साथ यूडीआईडी कार्ड संलग्न करें।',
      mr: 'swavlambancard.gov.in किंवा disabilityaffairs.gov.in वर सबमिट करा. या अर्जासोबत यूडीआयडी कार्ड जोडावे.'
    },
    schemeSpecificFields: [
      {
        key: 'udid_number',
        label: { en: 'UDID / Disability Certificate Number', hi: 'यूडीआईडी / दिव्यांगता प्रमाण पत्र संख्या', mr: 'यूडीआयडी / दिव्यांग प्रमाणपत्र क्रमांक' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. MH12345678901234', hi: 'उदा. MH12345678901234', mr: 'उदा. MH12345678901234' },
        promptQuestion: {
          en: 'What is your Unique Disability ID (UDID) or certificate number?',
          hi: 'आपका यूडीआईडी (UDID) या दिव्यांगता प्रमाण पत्र नंबर क्या है?',
          mr: 'तुमचा यूडीआयडी किंवा दिव्यांग प्रमाणपत्र क्रमांक काय आहे?'
        }
      },
      {
        key: 'disability_percentage',
        label: { en: 'Disability Percentage (%)', hi: 'दिव्यांगता प्रतिशत (%)', mr: 'दिव्यांगत्व टक्केवारी (%)' },
        type: 'number',
        required: true,
        placeholder: { en: 'e.g. 45', hi: 'उदा. 45', mr: 'उदा. ४५' },
        promptQuestion: {
          en: 'What is the certified disability percentage stated on your card?',
          hi: 'आपके प्रमाण पत्र में दिव्यांगता का प्रतिशत क्या है?',
          mr: 'तुमच्या प्रमाणपत्रात दिव्यांगत्वाची टक्केवारी किती नमूद आहे?'
        }
      },
      {
        key: 'bank_account_number',
        label: { en: 'DBT Bank Account Number', hi: 'बैंक खाता संख्या', mr: 'बँक खाते क्रमांक' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. 998877665544', hi: 'उदा. 998877665544', mr: 'उदा. ९९८८७७६६५५४४' },
        validationRegex: '^\\d{9,18}$',
        promptQuestion: {
          en: 'What is your bank account number?',
          hi: 'आपका बैंक खाता नंबर क्या है?',
          mr: 'तुमचा बँक खाते क्रमांक काय आहे?'
        }
      },
      {
        key: 'bank_ifsc_code',
        label: { en: 'Bank IFSC Code', hi: 'बैंक आईएफएससी कोड', mr: 'बँक आयएफएससी कोड' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. PUNB0001234', hi: 'उदा. PUNB0001234', mr: 'उदा. PUNB0001234' },
        validationRegex: '^[A-Z]{4}0[A-Z0-9]{6}$',
        promptQuestion: {
          en: 'What is your bank IFSC code?',
          hi: 'आपकी बैंक शाखा का आईएफएससी कोड क्या है?',
          mr: 'तुमच्या बँक शाखेचा आयएफएससी कोड काय आहे?'
        }
      }
    ]
  }
};

/**
 * Returns configuration for a scheme, with standard fallback for schemes without specialized fields.
 */
export function getOfficialSchemeConfig(schemeName: string, officialUrl?: string, ministry?: string): OfficialSchemeFormConfig {
  if (OFFICIAL_SCHEME_FORMS[schemeName]) {
    return OFFICIAL_SCHEME_FORMS[schemeName];
  }

  // Generalized fallback preserving official government metadata
  return {
    schemeName: schemeName,
    formCode: `GOI-${schemeName.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}-FORM-2026`,
    ministry: ministry || 'Government of India / State Authority',
    department: 'Citizen Welfare Division',
    applicationMode: 'Online',
    officialPortalUrl: officialUrl || 'https://www.india.gov.in',
    submissionGuidance: {
      en: `Submit through the official government portal at ${officialUrl || 'india.gov.in'} or present this printed draft to your local district welfare office.`,
      hi: `आधिकारिक पोर्टल ${officialUrl || 'india.gov.in'} पर जमा करें या अपने जिला कल्याण कार्यालय में यह मुद्रित प्रारूप प्रस्तुत करें।`,
      mr: `अधिकृत पोर्टल ${officialUrl || 'india.gov.in'} वर सबमिट करा किंवा तुमच्या जिल्हा समाजकल्याण कार्यालयात हा मसुदा सादर करा.`
    },
    schemeSpecificFields: [
      {
        key: 'bank_account_number',
        label: { en: 'Bank Account Number (DBT Enabled)', hi: 'बैंक खाता संख्या (डीबीटी)', mr: 'बँक खाते क्रमांक (डीबीटी)' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. 123456789012', hi: 'उदा. 123456789012', mr: 'उदा. १२३४५६७८९०१२' },
        validationRegex: '^\\d{9,18}$',
        promptQuestion: {
          en: 'What is your bank account number for direct benefit transfer?',
          hi: 'डीबीटी के लिए आपका बैंक खाता नंबर क्या है?',
          mr: 'थेट लाभ हस्तांतरणासाठी तुमचा बँक खाते क्रमांक काय आहे?'
        }
      },
      {
        key: 'bank_ifsc_code',
        label: { en: 'Bank Branch IFSC Code', hi: 'बैंक आईएफएससी कोड', mr: 'बँक आयएफएससी कोड' },
        type: 'text',
        required: true,
        placeholder: { en: 'e.g. SBIN0001234', hi: 'उदा. SBIN0001234', mr: 'उदा. SBIN0001234' },
        validationRegex: '^[A-Z]{4}0[A-Z0-9]{6}$',
        promptQuestion: {
          en: 'What is your bank branch IFSC Code?',
          hi: 'आपकी बैंक शाखा का आईएफएससी कोड क्या है?',
          mr: 'तुमच्या बँक शाखेचा आयएफएससी कोड काय आहे?'
        }
      }
    ]
  };
}
