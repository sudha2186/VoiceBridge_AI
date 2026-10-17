import type { Profile } from './profileService';
import type { Scheme } from './schemeService';
import { calculateAge } from '@/utils/ageUtils';

export type EligibilityStatus = 'eligible' | 'not_eligible' | 'needs_more_information' | 'partially_eligible';

export interface EligibilityResult {
  scheme: Scheme;
  status: EligibilityStatus;
  reasons: string[];
}

/**
 * Normalizes occupation strings for comparison across languages and synonyms.
 */
function normalizeOccupation(occ: string | null | undefined): string {
  if (!occ) return '';
  const s = occ.toLowerCase().trim();
  if (['farmer', 'farming', 'kisan', 'krishi', 'sheti', 'shetkari', 'agriculture'].includes(s)) {
    return 'farmer';
  }
  if (['student', 'vidyarthi', 'chhatra', 'education', 'studying'].includes(s)) {
    return 'student';
  }
  if (['entrepreneur', 'business', 'vyapari', 'self-employed', 'self employed', 'startup'].includes(s)) {
    return 'entrepreneur';
  }
  if (['artisan', 'karigar', 'craftsman'].includes(s)) {
    return 'artisan';
  }
  if (['rural worker', 'rural laborer', 'majdoor', 'mazdoor'].includes(s)) {
    return 'rural worker';
  }
  if (['urban worker', 'urban laborer'].includes(s)) {
    return 'urban worker';
  }
  return s;
}

/**
 * Checks a citizen profile against a scheme's verified eligibility criteria.
 * Dynamic age calculated from `date_of_birth` is the primary source of truth.
 * Disability status, income limits, occupation, state, and category are strictly evaluated.
 */
export function checkEligibility(
  profile: Profile,
  scheme: Scheme,
  lang: 'en' | 'hi' | 'mr' = 'en'
): EligibilityResult {
  const rules = scheme.eligibility_criteria;
  const reasons: string[] = [];
  let failed = 0;
  let missingCriteria = 0;

  if (!rules) {
    const noRulesMsg = {
      en: 'No restrictive eligibility criteria defined for this scheme.',
      hi: 'इस योजना के लिए कोई प्रतिबंधात्मक पात्रता मानदंड निर्धारित नहीं है।',
      mr: 'या योजनेसाठी कोणतेही बंधनात्मक पात्रता निकष निश्चित केलेले नाहीत.',
    }[lang];

    return {
      scheme,
      status: 'eligible',
      reasons: [noRulesMsg],
    };
  }

  // --- 1. Dynamic Age Check (Derived from DOB) ---
  const citizenAge = calculateAge(profile.date_of_birth) ?? profile.age;

  if (rules.age_min != null || rules.age_max != null) {
    if (citizenAge != null) {
      if (rules.age_min != null && citizenAge < rules.age_min) {
        failed++;
        const msg = {
          en: `Not eligible: minimum required age is ${rules.age_min} years (current age is ${citizenAge}).`,
          hi: `पात्र नहीं: न्यूनतम आवश्यक आयु ${rules.age_min} वर्ष है (आपकी आयु ${citizenAge} वर्ष है)।`,
          mr: `पात्र नाही: किमान आवश्यक वय ${rules.age_min} वर्षे आहे (आपले वय ${citizenAge} वर्षे आहे).`,
        }[lang];
        reasons.push(msg);
      } else if (rules.age_max != null && citizenAge > rules.age_max) {
        failed++;
        const msg = {
          en: `Not eligible: maximum eligible age is ${rules.age_max} years (current age is ${citizenAge}).`,
          hi: `पात्र नहीं: अधिकतम पात्र आयु ${rules.age_max} वर्ष है (आपकी आयु ${citizenAge} वर्ष है)।`,
          mr: `पात्र नाही: कमाल पात्र वय ${rules.age_max} वर्षे आहे (आपले वय ${citizenAge} वर्षे आहे).`,
        }[lang];
        reasons.push(msg);
      } else {
        const msg = {
          en: `Age verified: ${citizenAge} years meets scheme criteria.`,
          hi: `आयु सत्यापित: ${citizenAge} वर्ष योजना के मानदंडों के अनुरूप है।`,
          mr: `वय पडताळले: ${citizenAge} वर्षे योजनेच्या निकषांची पूर्तता करते.`,
        }[lang];
        reasons.push(msg);
      }
    } else {
      missingCriteria++;
      const msg = {
        en: 'Date of birth not provided — age-based eligibility cannot be fully verified.',
        hi: 'जन्म तिथि प्रदान नहीं की गई — आयु-आधारित पात्रता की पूरी जाँच नहीं की जा सकी।',
        mr: 'जन्मतारीख दिलेली नाही — वय-आधारित पात्रतेची पूर्ण पडताळणी करता येत नाही.',
      }[lang];
      reasons.push(msg);
    }
  }

  // --- 2. Disability Status Check ---
  const reqDisability = rules.disability_status?.toLowerCase().trim();
  if (reqDisability && reqDisability !== 'all' && reqDisability !== 'none') {
    const isDisabilityRequired =
      reqDisability === 'yes' ||
      reqDisability.includes('disab') ||
      reqDisability.includes('divyang') ||
      reqDisability.includes('pwd');

    const citizenDisability = profile.disability_status?.trim();
    if (citizenDisability) {
      const isYes = citizenDisability.toLowerCase() === 'yes';
      const isNo = citizenDisability.toLowerCase() === 'no';
      const isPreferNot = citizenDisability.toLowerCase().includes('prefer');

      if (isDisabilityRequired) {
        if (isYes) {
          const msg = {
            en: 'Disability requirement met: applicant eligible for Divyangjan assistance scheme.',
            hi: 'दिव्यांगता मानदंड सत्यापित: आवेदक दिव्यांगजन सहायता योजना के लिए पात्र हैं।',
            mr: 'दिव्यांगत्व निकष पडताळले: अर्जदार दिव्यांगजन सहाय्य योजनेसाठी पात्र आहेत.',
          }[lang];
          reasons.push(msg);
        } else if (isNo) {
          failed++;
          const msg = {
            en: 'Not eligible: this scheme is exclusively designated for persons with disabilities (Divyangjan).',
            hi: 'पात्र नहीं: यह योजना विशेष रूप से दिव्यांग नागरिकों (दिव्यांगजन) के लिए है।',
            mr: 'पात्र नाही: ही योजना केवळ दिव्यांग व्यक्तींसाठी (दिव्यांगजन) राखीव आहे.',
          }[lang];
          reasons.push(msg);
        } else if (isPreferNot) {
          missingCriteria++;
          const msg = {
            en: 'Disability status marked as "Prefer not to say" — scheme requires disability verification.',
            hi: 'दिव्यांगता स्थिति "बताना नहीं चाहते" चुनी गई — योजना के लिए दिव्यांगता सत्यापन आवश्यक है।',
            mr: 'दिव्यांगत्व "सांगू इच्छित नाही" निवडले — योजनेसाठी दिव्यांगत्व पडताळणी आवश्यक आहे.',
          }[lang];
          reasons.push(msg);
        }
      } else {
        // Scheme explicitly requires non-disabled status
        if (isNo) {
          const msg = {
            en: 'Disability status verified: meets general applicant requirements.',
            hi: 'दिव्यांगता स्थिति सत्यापित: सामान्य आवेदक मानदंडों को पूरा करता है।',
            mr: 'दिव्यांगत्व स्थिती पडताळली: सामान्य अर्जदार निकषांची पूर्तता होते.',
          }[lang];
          reasons.push(msg);
        } else if (isYes) {
          failed++;
          const msg = {
            en: 'Not eligible: this scheme is designated for non-disabled applicants.',
            hi: 'पात्र नहीं: यह योजना गैर-दिव्यांग आवेदकों के लिए है।',
            mr: 'पात्र नाही: ही योजना बिगर-दिव्यांग अर्जदारांसाठी आहे.',
          }[lang];
          reasons.push(msg);
        }
      }
    } else {
      missingCriteria++;
      const msg = {
        en: 'Disability status not provided — cannot verify scheme requirement.',
        hi: 'दिव्यांगता स्थिति प्रदान नहीं की गई — योजना की पात्रता की पुष्टि नहीं की जा सकी।',
        mr: 'दिव्यांगत्व स्थिती नमूद केलेली नाही — योजनेच्या निकषांची खात्री करता येत नाही.',
      }[lang];
      reasons.push(msg);
    }
  }

  // --- 3. Annual Income Check ---
  if (rules.income_max && rules.income_max > 0) {
    if (profile.annual_income != null) {
      if (profile.annual_income > rules.income_max) {
        failed++;
        const msg = {
          en: `Not eligible: annual income (₹${profile.annual_income.toLocaleString('en-IN')}) exceeds limit of ₹${rules.income_max.toLocaleString('en-IN')}.`,
          hi: `पात्र नहीं: वार्षिक आय (₹${profile.annual_income.toLocaleString('en-IN')}) योजना सीमा ₹${rules.income_max.toLocaleString('en-IN')} से अधिक है।`,
          mr: `पात्र नाही: वार्षिक उत्पन्न (₹${profile.annual_income.toLocaleString('en-IN')}) योजना मर्यादा ₹${rules.income_max.toLocaleString('en-IN')} पेक्षा जास्त आहे.`,
        }[lang];
        reasons.push(msg);
      } else {
        const msg = {
          en: `Income verified: ₹${profile.annual_income.toLocaleString('en-IN')} is within the ₹${rules.income_max.toLocaleString('en-IN')} limit.`,
          hi: `आय सत्यापित: ₹${profile.annual_income.toLocaleString('en-IN')} आय सीमा ₹${rules.income_max.toLocaleString('en-IN')} के अंतर्गत है।`,
          mr: `उत्पन्न पडताळले: ₹${profile.annual_income.toLocaleString('en-IN')} उत्पन्न मर्यादा ₹${rules.income_max.toLocaleString('en-IN')} च्या आत आहे.`,
        }[lang];
        reasons.push(msg);
      }
    } else {
      missingCriteria++;
      const msg = {
        en: 'Annual income not provided — cannot verify income eligibility.',
        hi: 'वार्षिक आय प्रदान नहीं की गई — आय पात्रता की जाँच नहीं हो सकी।',
        mr: 'वार्षिक उत्पन्न दिलेले नाही — उत्पन्न पात्रतेची पडताळणी करता येत नाही.',
      }[lang];
      reasons.push(msg);
    }
  }

  // --- 4. Occupation Check ---
  if (rules.occupations && rules.occupations.length > 0 && !rules.occupations.includes('all')) {
    if (profile.occupation) {
      const citizenOccNorm = normalizeOccupation(profile.occupation);
      const matched = rules.occupations.some(
        (reqOcc) => normalizeOccupation(reqOcc) === citizenOccNorm
      );
      if (!matched) {
        failed++;
        const reqStr = rules.occupations.join(', ');
        const msg = {
          en: `Not eligible: scheme is designated for ${reqStr} (your occupation: ${profile.occupation}).`,
          hi: `पात्र नहीं: यह योजना ${reqStr} के लिए है (आपका व्यवसाय: ${profile.occupation})।`,
          mr: `पात्र नाही: ही योजना ${reqStr} साठी आहे (आपला व्यवसाय: ${profile.occupation}).`,
        }[lang];
        reasons.push(msg);
      } else {
        const msg = {
          en: `Occupation matched: eligible for ${profile.occupation} applicants.`,
          hi: `व्यवसाय मेल खाता है: ${profile.occupation} आवेदकों के लिए पात्र।`,
          mr: `व्यवसाय जुळला: ${profile.occupation} अर्जदारांसाठी पात्र.`,
        }[lang];
        reasons.push(msg);
      }
    } else {
      missingCriteria++;
      const msg = {
        en: 'Occupation not provided — cannot verify occupation requirement.',
        hi: 'व्यवसाय प्रदान नहीं किया गया — व्यवसाय पात्रता की पुष्टि नहीं हो सकी।',
        mr: 'व्यवसाय दिलेला नाही — व्यवसाय निकषांची खात्री करता येत नाही.',
      }[lang];
      reasons.push(msg);
    }
  }

  // --- 5. Gender Check ---
  if (rules.gender && rules.gender.toLowerCase() !== 'all') {
    if (profile.gender) {
      const userGender = profile.gender.toLowerCase().trim();
      const reqGender = rules.gender.toLowerCase().trim();
      if (userGender !== reqGender) {
        failed++;
        const msg = {
          en: `Not eligible: this scheme is designated for ${rules.gender} applicants.`,
          hi: `पात्र नहीं: यह योजना ${rules.gender} आवेदकों के लिए निर्धारित है।`,
          mr: `पात्र नाही: ही योजना ${rules.gender} अर्जदारांसाठी राखीव आहे.`,
        }[lang];
        reasons.push(msg);
      } else {
        const msg = {
          en: `Gender requirement met: applicable for ${rules.gender} citizens.`,
          hi: `लिंग मानदंड पूरा हुआ: ${rules.gender} नागरिकों के लिए लागू।`,
          mr: `लिंग निकष पूर्ण: ${rules.gender} नागरिकांसाठी लागू.`,
        }[lang];
        reasons.push(msg);
      }
    } else {
      missingCriteria++;
      const msg = {
        en: 'Gender not provided — cannot verify gender eligibility.',
        hi: 'लिंग प्रदान नहीं किया गया — लिंग पात्रता की पुष्टि नहीं हो सकी।',
        mr: 'लिंग नमूद केलेले नाही — लिंग निकषांची पडताळणी करता येत नाही.',
      }[lang];
      reasons.push(msg);
    }
  }

  // --- 6. Category Check ---
  if (rules.categories && rules.categories.length > 0 && !rules.categories.includes('all')) {
    if (profile.category) {
      const userCat = profile.category.toLowerCase().trim();
      const matched = rules.categories.some((c) => c.toLowerCase().trim() === userCat);
      if (!matched) {
        failed++;
        const catStr = rules.categories.join(', ');
        const msg = {
          en: `Not eligible: scheme requires ${catStr} category (your category: ${profile.category}).`,
          hi: `पात्र नहीं: योजना के लिए ${catStr} वर्ग आवश्यक है (आपका वर्ग: ${profile.category})।`,
          mr: `पात्र नाही: योजनेसाठी ${catStr} प्रवर्ग आवश्यक आहे (आपला प्रवर्ग: ${profile.category}).`,
        }[lang];
        reasons.push(msg);
      } else {
        const msg = {
          en: `Category matched: eligible for ${profile.category} category.`,
          hi: `वर्ग मेल खाता है: ${profile.category} वर्ग के लिए पात्र।`,
          mr: `प्रवर्ग जुळला: ${profile.category} प्रवर्गासाठी पात्र.`,
        }[lang];
        reasons.push(msg);
      }
    } else {
      missingCriteria++;
      const msg = {
        en: 'Caste/category not provided — cannot verify category requirement.',
        hi: 'जाति/वर्ग प्रदान नहीं किया गया — वर्ग पात्रता की पुष्टि नहीं हो सकी।',
        mr: 'जात/प्रवर्ग नमूद केलेला नाही — प्रवर्ग निकषांची पडताळणी करता येत नाही.',
      }[lang];
      reasons.push(msg);
    }
  }

  // --- 7. State Applicability Check ---
  const stateRule = scheme.state_applicable?.trim();
  if (stateRule && stateRule.toLowerCase() !== 'all states') {
    if (profile.state) {
      const userState = profile.state.toLowerCase().trim();
      const reqState = stateRule.toLowerCase();
      if (reqState !== userState && !reqState.includes(userState)) {
        failed++;
        const msg = {
          en: `Not eligible: scheme is applicable in ${stateRule} only (your state: ${profile.state}).`,
          hi: `पात्र नहीं: यह योजना केवल ${stateRule} में लागू है (आपका राज्य: ${profile.state})।`,
          mr: `पात्र नाही: ही योजना केवळ ${stateRule} मध्ये लागू आहे (आपले राज्य: ${profile.state}).`,
        }[lang];
        reasons.push(msg);
      } else {
        const msg = {
          en: `State applicability confirmed for ${profile.state}.`,
          hi: `${profile.state} के लिए राज्य पात्रता की पुष्टि हुई।`,
          mr: `${profile.state} साठी राज्य पात्रता निश्चित झाली.`,
        }[lang];
        reasons.push(msg);
      }
    } else {
      missingCriteria++;
      const msg = {
        en: 'State of residence not provided — cannot verify regional applicability.',
        hi: 'निवास का राज्य प्रदान नहीं किया गया — क्षेत्रीय पात्रता की पुष्टि नहीं हो सकी।',
        mr: 'राहते राज्य नमूद केलेले नाही — प्रादेशिक पात्रतेची खात्री करता येत नाही.',
      }[lang];
      reasons.push(msg);
    }
  }

  // --- Status Determination ---
  let status: EligibilityStatus;
  if (failed > 0) {
    status = 'not_eligible';
  } else if (missingCriteria > 0) {
    status = 'needs_more_information';
  } else {
    status = 'eligible';
    const allMetMsg = {
      en: 'You meet all verified eligibility criteria for this scheme.',
      hi: 'आप इस योजना के सभी सत्यापित पात्रता मानदंडों को पूरा करते हैं।',
      mr: 'आपण या योजनेच्या सर्व पडताळलेल्या पात्रता निकषांची पूर्तता करता.',
    }[lang];
    reasons.unshift(allMetMsg);
  }

  return { scheme, status, reasons };
}

/**
 * Checks eligibility across all schemes with language support.
 */
export function checkAllEligibility(
  profile: Profile,
  schemes: Scheme[],
  lang: 'en' | 'hi' | 'mr' = 'en'
): EligibilityResult[] {
  return schemes.map((scheme) => checkEligibility(profile, scheme, lang));
}
