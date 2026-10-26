"""
VoiceBridge AI — Multilingual NLP Normalizers and Rule Extractors
Supports Hindi, Marathi, English, and code-mixed inputs.
Maps raw entity strings to canonical Supabase profile schema values.
"""

import re
from datetime import datetime, date
from typing import Optional, Tuple, Dict, Any, List

# ----------------------------------------------------
# 1. Number Mappings (Hindi & Marathi Devanagari words)
# ----------------------------------------------------

HINDI_NUMBERS = {
    "शून्य": 0, "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5, "पांच": 5,
    "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10, "ग्यारह": 11, "बारह": 12,
    "तेरह": 13, "चौदह": 14, "पंद्रह": 15, "सोलह": 16, "सत्रह": 17, "अठारह": 18,
    "उन्नीस": 19, "बीस": 20, "इक्कीस": 21, "बाईस": 22, "तेईस": 23, "चौबीस": 24,
    "पच्चीस": 25, "छब्बीस": 26, "सत्ताईस": 27, "अट्ठाईस": 28, "उनतीस": 29, "तीस": 30,
    "इकतीस": 31, "बत्तीस": 32, "तैंतीस": 33, "चौंतीस": 34, "पैंतीस": 35, "छत्तीस": 36,
    "सैंतीस": 37, "अड़तीस": 38, "उनतालीस": 39, "चालीस": 40, "इकतालीस": 41, "बयालीस": 42,
    "पैंतालीस": 45, "पचास": 50, "पचपन": 55, "साठ": 60, "पैंसठ": 65, "सत्तर": 70,
    "अस्सी": 80, "नब्बे": 90, "सौ": 100
}

MARATHI_NUMBERS = {
    "शून्य": 0, "एक": 1, "दोन": 2, "तीन": 3, "चार": 4, "पाच": 5, "सहा": 6,
    "सात": 7, "आठ": 8, "नऊ": 9, "दहा": 10, "अकरा": 11, "बारा": 12, "तेरा": 13,
    "चौदा": 14, "पंधरा": 15, "सोळा": 16, "सतरा": 17, "अठरा": 18, "एकोणीस": 19,
    "वीस": 20, "एकवीस": 21, "बावीस": 22, "तेवीस": 23, "चोवीस": 24, "पंचवीस": 25,
    "सव्वीस": 26, "सत्तावीस": 27, "अठ्ठावीस": 28, "एकोणतीस": 29, "तीस": 30,
    "एकतीस": 31, "बत्तीस": 32, "तेहेतीस": 33, "चौतीस": 34, "पस्तीस": 35, "छत्तीस": 36,
    "सदतीस": 37, "अडतीस": 38, "एकेचाळीस": 41, "चाळीस": 40, "पंचेचाळीस": 45, "पन्नास": 50,
    "साठ": 60, "सत्तर": 70, "ऐंशी": 80, "नव्वद": 90, "शंभर": 100
}

DEVANAGARI_DIGITS_TRANS = str.maketrans("०१२३४५६७८९", "0123456789")

# ----------------------------------------------------
# 2. Comprehensive State and District Mappings
# ----------------------------------------------------

CANONICAL_STATES = {
    "महाराष्ट्र": "Maharashtra", "महाराष्ट्रात": "Maharashtra", "महाराष्ट्रातील": "Maharashtra",
    "maharashtra": "Maharashtra",
    "उत्तर प्रदेश": "Uttar Pradesh", "uttar pradesh": "Uttar Pradesh",
    "मध्य प्रदेश": "Madhya Pradesh", "madhya pradesh": "Madhya Pradesh",
    "गुजरात": "Gujarat", "gujarat": "Gujarat",
    "बिहार": "Bihar", "bihar": "Bihar",
    "राजस्थान": "Rajasthan", "rajasthan": "Rajasthan",
    "कर्नाटक": "Karnataka", "karnataka": "Karnataka",
    "तमिलनाडु": "Tamil Nadu", "तमिल नाडू": "Tamil Nadu", "tamil nadu": "Tamil Nadu",
    "पश्चिम बंगाल": "West Bengal", "west bengal": "West Bengal",
    "पंजाब": "Punjab", "punjab": "Punjab",
    "हरियाणा": "Haryana", "haryana": "Haryana",
    "दिल्ली": "Delhi", "delhi": "Delhi",
    "केरळ": "Kerala", "केरल": "Kerala", "kerala": "Kerala",
    "आंध्र प्रदेश": "Andhra Pradesh", "andhra pradesh": "Andhra Pradesh",
    "तेलंगणा": "Telangana", "तेलंगाना": "Telangana", "telangana": "Telangana",
    "ओडिशा": "Odisha", "उड़ीसा": "Odisha", "odisha": "Odisha",
    "आसाम": "Assam", "असम": "Assam", "assam": "Assam"
}

# State abbreviations requiring strict word boundaries (\bup\b, \bmh\b, etc.)
STATE_ABBREVIATIONS = {
    "mh": "Maharashtra",
    "up": "Uttar Pradesh",
    "mp": "Madhya Pradesh",
    "wb": "West Bengal",
    "tn": "Tamil Nadu",
    "ka": "Karnataka",
    "gj": "Gujarat",
    "rj": "Rajasthan",
    "pb": "Punjab",
    "hr": "Haryana",
    "dl": "Delhi",
    "ap": "Andhra Pradesh",
    "ts": "Telangana"
}

# All 36 Districts of Maharashtra + Major National Districts with Devanagari & Inflections
CANONICAL_DISTRICTS = {
    # Maharashtra Districts (Comprehensive 36)
    "ठाणे": "Thane", "ठाण्यात": "Thane", "thane": "Thane", "थाने": "Thane", "थाणे": "Thane", "ठाने": "Thane", "thana": "Thane",
    "पालघर": "Palghar", "palghar": "Palghar",
    "रायगड": "Raigad", "रायगढ": "Raigad", "raigad": "Raigad",
    "रत्नागिरी": "Ratnagiri", "ratnagiri": "Ratnagiri",
    "सिंधुदुर्ग": "Sindhudurg", "sindhudurg": "Sindhudurg",
    "पुणे": "Pune", "पुण्यात": "Pune", "पुण्यामध्ये": "Pune", "पुने": "Pune", "pune": "Pune",
    "सातारा": "Satara", "satara": "Satara",
    "सांगली": "Sangli", "sangli": "Sangli",
    "सोलापूर": "Solapur", "सोलापुर": "Solapur", "solapur": "Solapur",
    "कोल्हापूर": "Kolhapur", "कोल्हापुर": "Kolhapur", "kolhapur": "Kolhapur",
    "नाशिक": "Nashik", "नाशिकमध्ये": "Nashik", "नासिक": "Nashik", "nashik": "Nashik",
    "धुळे": "Dhule", "धुले": "Dhule", "धुलिया": "Dhule", "dhule": "Dhule",
    "नंदुरबार": "Nandurbar", "नन्दुरबार": "Nandurbar", "nandurbar": "Nandurbar",
    "जळगाव": "Jalgaon", "जलगांव": "Jalgaon", "jalgaon": "Jalgaon",
    "अहमदनगर": "Ahmednagar", "ahmednagar": "Ahmednagar", "अहिल्यानगर": "Ahmednagar",
    "छत्रपती संभाजीनगर": "Chhatrapati Sambhajinagar", "औरंगाबाद": "Chhatrapati Sambhajinagar", "संभाजीनगर": "Chhatrapati Sambhajinagar",
    "aurangabad": "Chhatrapati Sambhajinagar", "chhatrapati sambhajinagar": "Chhatrapati Sambhajinagar",
    "जालना": "Jalna", "jalna": "Jalna",
    "परभणी": "Parbhani", "परभनी": "Parbhani", "parbhani": "Parbhani",
    "हिंगोली": "Hingoli", "hingoli": "Hingoli",
    "नांदेड": "Nanded", "नांदेड़": "Nanded", "nanded": "Nanded",
    "बीड": "Beed", "beed": "Beed",
    "लातूर": "Latur", "लातुर": "Latur", "latur": "Latur",
    "धाराशिव": "Dharashiv", "उस्मानाबाद": "Dharashiv", "osmanabad": "Dharashiv", "dharashiv": "Dharashiv",
    "बुलढाणा": "Buldhana", "बुलडाणा": "Buldhana", "buldhana": "Buldhana",
    "अकोला": "Akola", "akola": "Akola",
    "वाशीम": "Washim", "वाशिम": "Washim", "washim": "Washim",
    "अमरावती": "Amravati", "अमरावतीमध्ये": "Amravati", "amravati": "Amravati",
    "यवतमाळ": "Yavatmal", "यवतमाल": "Yavatmal", "yavatmal": "Yavatmal",
    "वर्धा": "Wardha", "wardha": "Wardha",
    "नागपूर": "Nagpur", "नागपुर": "Nagpur", "nagpur": "Nagpur",
    "भंडारा": "Bhandara", "bhandara": "Bhandara",
    "गोंदिया": "Gondia", "गोन्दिया": "Gondia", "gondia": "Gondia",
    "चंद्रपूर": "Chandrapur", "चंद्रपुर": "Chandrapur", "chandrapur": "Chandrapur",
    "गडचिरोली": "Gadchiroli", "गड़चिरोली": "Gadchiroli", "gadchiroli": "Gadchiroli",
    "मुंबई": "Mumbai", "mumbai": "Mumbai", "बॉम्बे": "Mumbai", "bombay": "Mumbai",
    "मुंबई उपनगर": "Mumbai Suburban", "mumbai suburban": "Mumbai Suburban",

    # Major Districts in Other States
    "लखनौ": "Lucknow", "लखनऊ": "Lucknow", "lucknow": "Lucknow",
    "कानपूर": "Kanpur", "कानपुर": "Kanpur", "kanpur": "Kanpur",
    "वाराणसी": "Varanasi", "बनारस": "Varanasi", "varanasi": "Varanasi", "kashi": "Varanasi",
    "आग्रा": "Agra", "आगरा": "Agra", "agra": "Agra",
    "प्रयागराज": "Prayagraj", "इलाहाबाद": "Prayagraj", "prayagraj": "Prayagraj",
    "गोरखपूर": "Gorakhpur", "गोरखपुर": "Gorakhpur", "gorakhpur": "Gorakhpur",
    "नोएडा": "Noida", "गौतम बुद्ध नगर": "Gautam Buddha Nagar", "noida": "Noida",
    "गाझियाबाद": "Ghaziabad", "गाजियाबाद": "Ghaziabad", "ghaziabad": "Ghaziabad",
    "अहमदाबाद": "Ahmedabad", "ahmedabad": "Ahmedabad",
    "सुरत": "Surat", "सूरत": "Surat", "surat": "Surat",
    "वडोदरा": "Vadodara", "बड़ौदा": "Vadodara", "vadodara": "Vadodara",
    "राजकोट": "Rajkot", "rajkot": "Rajkot",
    "जयपूर": "Jaipur", "जयपुर": "Jaipur", "jaipur": "Jaipur",
    "जोधपूर": "Jodhpur", "जोधपुर": "Jodhpur", "jodhpur": "Jodhpur",
    "उदयपूर": "Udaipur", "उदयपुर": "Udaipur", "udaipur": "Udaipur",
    "पाटणा": "Patna", "पटना": "Patna", "patna": "Patna",
    "गया": "Gaya", "gaya": "Gaya",
    "भोपाळ": "Bhopal", "भोपाल": "Bhopal", "bhopal": "Bhopal",
    "इंदूर": "Indore", "इंदौर": "Indore", "indore": "Indore",
    "ग्वालियर": "Gwalior", "gwalior": "Gwalior",
    "जबलपूर": "Jabalpur", "जबलपुर": "Jabalpur", "jabalpur": "Jabalpur",
    "बेंगळुरू": "Bengaluru", "बैंगलोर": "Bengaluru", "bengaluru": "Bengaluru", "bangalore": "Bengaluru",
    "म्हैसूर": "Mysuru", "मैसूर": "Mysuru", "mysuru": "Mysuru",
    "चेन्नई": "Chennai", "मद्रास": "Chennai", "chennai": "Chennai",
    "कोइम्बतूर": "Coimbatore", "coimbatore": "Coimbatore",
    "कोलकाता": "Kolkata", "कलकत्ता": "Kolkata", "kolkata": "Kolkata",
    "लुधियाना": "Ludhiana", "ludhiana": "Ludhiana",
    "अमृतसर": "Amritsar", "amritsar": "Amritsar",
    "गुरुग्राम": "Gurugram", "गुडगाँव": "Gurugram", "gurugram": "Gurugram", "gurgaon": "Gurugram",
    "फरीदाबाद": "Faridabad", "faridabad": "Faridabad",
    "तिरुवनंतपुरम": "Thiruvananthapuram", "त्रिवेंद्रम": "Thiruvananthapuram", "thiruvananthapuram": "Thiruvananthapuram",
    "कोची": "Kochi", "कोचीन": "Kochi", "kochi": "Kochi",
    "हैदराबाद": "Hyderabad", "hyderabad": "Hyderabad"
}

# State-District Consistency Mapping
DISTRICT_TO_STATE = {
    "Thane": "Maharashtra", "Palghar": "Maharashtra", "Raigad": "Maharashtra",
    "Ratnagiri": "Maharashtra", "Sindhudurg": "Maharashtra", "Pune": "Maharashtra",
    "Satara": "Maharashtra", "Sangli": "Maharashtra", "Solapur": "Maharashtra",
    "Kolhapur": "Maharashtra", "Nashik": "Maharashtra", "Dhule": "Maharashtra",
    "Nandurbar": "Maharashtra", "Jalgaon": "Maharashtra", "Ahmednagar": "Maharashtra",
    "Chhatrapati Sambhajinagar": "Maharashtra", "Jalna": "Maharashtra", "Parbhani": "Maharashtra",
    "Hingoli": "Maharashtra", "Nanded": "Maharashtra", "Beed": "Maharashtra",
    "Latur": "Maharashtra", "Dharashiv": "Maharashtra", "Buldhana": "Maharashtra",
    "Akola": "Maharashtra", "Washim": "Maharashtra", "Amravati": "Maharashtra",
    "Yavatmal": "Maharashtra", "Wardha": "Maharashtra", "Nagpur": "Maharashtra",
    "Bhandara": "Maharashtra", "Gondia": "Maharashtra", "Chandrapur": "Maharashtra",
    "Gadchiroli": "Maharashtra", "Mumbai": "Maharashtra", "Mumbai Suburban": "Maharashtra",
    "Lucknow": "Uttar Pradesh", "Kanpur": "Uttar Pradesh", "Varanasi": "Uttar Pradesh",
    "Agra": "Uttar Pradesh", "Prayagraj": "Uttar Pradesh", "Gorakhpur": "Uttar Pradesh",
    "Noida": "Uttar Pradesh", "Gautam Buddha Nagar": "Uttar Pradesh", "Ghaziabad": "Uttar Pradesh",
    "Ahmedabad": "Gujarat", "Surat": "Gujarat", "Vadodara": "Gujarat", "Rajkot": "Gujarat",
    "Jaipur": "Rajasthan", "Jodhpur": "Rajasthan", "Udaipur": "Rajasthan",
    "Patna": "Bihar", "Gaya": "Bihar",
    "Bhopal": "Madhya Pradesh", "Indore": "Madhya Pradesh", "Gwalior": "Madhya Pradesh", "Jabalpur": "Madhya Pradesh",
    "Bengaluru": "Karnataka", "Mysuru": "Karnataka",
    "Chennai": "Tamil Nadu", "Coimbatore": "Tamil Nadu",
    "Kolkata": "West Bengal",
    "Ludhiana": "Punjab", "Amritsar": "Punjab",
    "Gurugram": "Haryana", "Faridabad": "Haryana",
    "Thiruvananthapuram": "Kerala", "Kochi": "Kerala",
    "Hyderabad": "Telangana"
}

def extract_state_and_district(
    text: str,
    ner_entities: Dict[str, str],
    lang: str = "en"
) -> Tuple[Optional[str], Optional[str], Dict[str, str]]:
    """
    Safely extracts State and District ensuring:
    1. Word-boundary state abbreviation checks (never matches 'up' inside 'rupees').
    2. Explicit district extraction handling inflections ('Thane district', 'ठाणे जिला', 'ठाणे जिल्ह्यात').
    3. State-District consistency checks.
    4. Never infers district solely from state.
    """
    sources: Dict[str, str] = {}
    state: Optional[str] = None
    district: Optional[str] = None

    text_lower = text.lower()

    # 1A. Check explicit district mentions: Keyword BEFORE District Name
    # e.g., "My district is Thane", "जिला ठाणे", "मेरा जिला ठाणे है", "माझा जिल्हा ठाणे आहे"
    kw_first_pattern = re.search(
        r"(?:district(?:\s+is)?|district\s*name\s*is|जिला(?:\s*[:\-]?|\s+है)?|जिले(?:\s*[:\-]?|\s+का\s*नाम)?|जिल्हा(?:\s*[:\-]?|\s+आहे)?|जिल्ह्याचे\s*नाव)\s*[:\-\u2013]?\s*([A-Za-z\u0900-\u097F]+)",
        text,
        re.IGNORECASE
    )
    if kw_first_pattern:
        cand = kw_first_pattern.group(1).strip().lower()
        if cand in CANONICAL_DISTRICTS:
            district = CANONICAL_DISTRICTS[cand]
            sources["district"] = "rule_district_pattern_kw_first"

    # 1B. Check explicit district mentions: District Name BEFORE Keyword
    # e.g., "Thane district", "in Thane", "ठाणे जिले", "ठाणे जिल्ह्यात", "ठाणे जिल्हा"
    if not district:
        district_pattern = re.search(
            r"([A-Za-z\u0900-\u097F]+)\s*(?:district|जिला|जिले|जिल्हा|जिल्ह्यात|मध्ये)\b",
            text,
            re.IGNORECASE
        )
        if district_pattern:
            cand = district_pattern.group(1).strip().lower()
            if cand in CANONICAL_DISTRICTS:
                district = CANONICAL_DISTRICTS[cand]
                sources["district"] = "rule_district_pattern_kw_after"

    # 2. Check from NER model outputs
    ner_dist = ner_entities.get("DISTRICT")
    if not district and ner_dist:
        for k, v in CANONICAL_DISTRICTS.items():
            if re.search(rf"\b{re.escape(k.lower())}\b", ner_dist.lower()):
                district = v
                sources["district"] = "model_crf" if lang == "en" else "model_ner_loc"
                break

    # 3. Direct dictionary match for district (sorted by length descending for longest phrase matching)
    if not district:
        sorted_keys = sorted(CANONICAL_DISTRICTS.keys(), key=len, reverse=True)
        for k in sorted_keys:
            k_lower = k.lower()
            if re.search(rf"(?:^|[^\w\u0900-\u097F]){re.escape(k_lower)}(?:$|[^\w\u0900-\u097F])", text_lower):
                district = CANONICAL_DISTRICTS[k]
                sources["district"] = "rule_pattern"
                break

    # 4. Extract State
    ner_state = ner_entities.get("STATE")
    if ner_state:
        for k, v in CANONICAL_STATES.items():
            if k.lower() in ner_state.lower():
                state = v
                sources["state"] = "model_crf" if lang == "en" else "model_ner_loc"
                break

    if not state:
        # Check canonical state names
        for k, v in CANONICAL_STATES.items():
            if k.lower() in text_lower:
                state = v
                sources["state"] = "rule_pattern"
                break

    if not state:
        # Check 2-letter state abbreviations STRICTLY with word boundaries
        for abbr, st_name in STATE_ABBREVIATIONS.items():
            if re.search(rf"\b{abbr}\b", text_lower):
                state = st_name
                sources["state"] = "rule_state_abbr"
                break

    # 5. State-District Consistency Validation & Inference
    if district and not state:
        if district in DISTRICT_TO_STATE:
            state = DISTRICT_TO_STATE[district]
            sources["state"] = "rule_district_inference"
    elif district and state:
        expected_state = DISTRICT_TO_STATE.get(district)
        if expected_state and expected_state != state:
            # Document discrepancy or keep both if explicitly provided
            sources["geo_note"] = f"District {district} belongs to {expected_state}; text also mentioned {state}."

    return state, district, sources

# ----------------------------------------------------
# 3. Gender, Category, Occupation Normalizers
# ----------------------------------------------------

def normalize_gender(raw: str | None) -> str | None:
    if not raw:
        return None
    s = raw.strip().lower()

    if re.search(r"\b(female|woman|girl|महिला|औरत|स्त्री|मुलगी)\b", s):
        return "Female"
    if re.search(r"\b(male|man|boy|पुरुष|लड़का|नर|मुलगा)\b", s):
        return "Male"
    if re.search(r"\b(other|transgender|अन्य|तृतीयपंथी)\b", s):
        return "Other"

    return None

def normalize_category(raw: str | None) -> str | None:
    if not raw:
        return None
    s = raw.strip().lower()

    if re.search(r"\bobc\b", s) or "ओबीसी" in s or "इमाव" in s:
        return "OBC"
    if re.search(r"\bsc\b", s) or "एससी" in s or "अनुसूचित जाती" in s:
        return "SC"
    if re.search(r"\bst\b", s) or "एसटी" in s or "अनुसूचित जमाती" in s:
        return "ST"
    if re.search(r"\b(general|open|gen)\b", s) or "सामान्य" in s or "खुला" in s:
        return "General"

    return None

def normalize_occupation(raw: str | None) -> str | None:
    if not raw:
        return None
    s = raw.strip().lower()
    if any(k in s for k in ["शेतकरी", "शेती", "किसान", "खेती", "farmer", "farming", "agriculture", "कृषक"]):
        return "Farmer"
    if any(k in s for k in ["विद्यार्थी", "छात्र", "student", "studying", "college", "school"]):
        return "Student"
    if any(k in s for k in ["व्यापारी", "व्यवसाय", "धंदा", "entrepreneur", "business", "shopkeeper", "dukan", "self-employed", "self employed"]):
        return "Entrepreneur"
    if any(k in s for k in ["कारागीर", "कारीगर", "artisan", "craftsman", "weaver"]):
        return "Artisan"
    if any(k in s for k in ["ग्रामीण कामगार", "ग्रामीण मजूर", "मजदूर", "laborer", "rural worker"]):
        return "Rural Worker"
    if any(k in s for k in ["शहरी कामगार", "urban worker"]):
        return "Urban Worker"
    if any(k in s for k in ["शिक्षक", "teacher"]):
        return "Teacher"

    clean = re.sub(r"[^\w\s]", "", s).strip().title()
    words = clean.split()
    if 1 <= len(words) <= 3 and len(clean) <= 25:
        forbidden_occ = {"and", "the", "for", "income", "caste", "born", "years", "live", "annual", "category", "rupees", "male", "female"}
        if not any(w.lower() in forbidden_occ for w in words):
            return clean

    return None

# ----------------------------------------------------
# 4. Context-Aware Annual Income Extractor
# ----------------------------------------------------

INCOME_CONTEXT_PATTERNS = [
    r"(?:annual\s+income|income|salary|earning|earnings|salaried)\b",
    r"(?:वार्षिक\s*आय|सालाना\s*आय|मासिक\s*वेतन|महीने\s*का|आय|वेतन|कमाई)\b",
    r"(?:वार्षिक\s*उत्पन्न|उत्पन्न|दरमहा|पगार|कमावतो|कमावते)\b",
    r"(?:per\s+year|annually|per\s+annum|p\.a\.)\b",
    r"(?:per\s+month|monthly|p\.m\.)\b"
]

def has_income_context(text: str) -> bool:
    """Checks whether the text explicitly states an income or salary context."""
    for pattern in INCOME_CONTEXT_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def normalize_income(
    raw: str | None,
    context_text: Optional[str] = None
) -> Tuple[Optional[int], Optional[str]]:
    """
    Safely extracts annual income with explicit context verification:
    1. Rejects 4-digit numbers that match birth years (1920-2026) unless clear income context exists.
    2. Detects monthly frequency vs annual frequency and appropriately converts (monthly * 12).
    3. Handles word numbers in Hindi, Marathi, English ('दो लाख', 'दोन लाख', '2 lakh').
    4. Returns (annual_income, frequency_status: 'annual' | 'converted_from_monthly' | 'ambiguous').
    """
    if not raw:
        return None, None

    full_context = f"{raw} {context_text or ''}".lower()

    # If parsing a generic sentence (not a dedicated entity span), require income context
    if context_text and not has_income_context(full_context):
        return None, None

    s = str(raw).translate(DEVANAGARI_DIGITS_TRANS).strip().lower()

    # Detect frequency
    is_monthly = bool(re.search(r"(?:per\s+month|monthly|p\.m\.|दरमहा|महीने\s*का|दर\s*महिना)\b", full_context))

    # Mask out explicit DOB / Birth Year patterns so they aren't parsed as income numbers
    # e.g., "born in 1986", "15/08/1986", "जन्म 1986"
    s_cleaned = re.sub(r"(?:born|birth|जन्म|साल)\s+(?:in\s+)?(19\d\d|20[0-2]\d)\b", "", s, flags=re.IGNORECASE)
    s_cleaned = re.sub(r"\b\d{1,2}[/-]\d{1,2}[/-](?:19\d\d|20[0-2]\d)\b", "", s_cleaned)

    # Word phrase matches (Lakh expressions)
    phrases = {
        "दीड लाख": 150000, "डेढ़ लाख": 150000, "one and half lakh": 150000, "1.5 lakh": 150000,
        "अडीच लाख": 250000, "ढाई लाख": 250000, "two and half lakh": 250000, "2.5 lakh": 250000,
        "एक लाख": 100000, "one lakh": 100000, "दोन लाख": 200000, "दो लाख": 200000, "two lakh": 200000,
        "तीन लाख": 300000, "three lakh": 300000, "चार लाख": 400000, "four lakh": 400000,
        "पाच लाख": 500000, "पांच लाख": 500000, "five lakh": 500000, "सहा लाख": 600000, "छह लाख": 600000,
        "सात लाख": 700000, "seven lakh": 700000, "आठ लाख": 800000, "eight lakh": 800000,
        "नऊ लाख": 900000, "नौ लाख": 900000, "nine lakh": 900000, "दहा लाख": 1000000, "दस लाख": 1000000
    }
    for phrase, val in phrases.items():
        if phrase in s_cleaned:
            final_val = val * 12 if is_monthly else val
            return final_val, "converted_from_monthly" if is_monthly else "annual"

    # Numeric lakh e.g. "2 lakh", "3.5 लाख"
    lakh_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|लाख|लख)", s_cleaned)
    if lakh_match:
        val = int(float(lakh_match.group(1)) * 100000)
        final_val = val * 12 if is_monthly else val
        return final_val, "converted_from_monthly" if is_monthly else "annual"

    # Thousand e.g. "50 thousand", "20 हजार"
    thousand_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:thousand|thousands|हजार|हज़ार|k)\b", s_cleaned)
    if thousand_match:
        val = int(float(thousand_match.group(1)) * 1000)
        final_val = val * 12 if is_monthly else val
        return final_val, "converted_from_monthly" if is_monthly else "annual"

    # Numeric digits with currency symbols or explicit income keyword adjacency
    # e.g., "Rs. 250000", "₹ 20,000", "salary is 20,000", "income is 240000"
    num_with_context = re.search(
        r"(?:Rs\.?|₹|inr|रुपये|रु\.|income|salary|earnings|आय|उत्पन्न|पगार)\s*(?:is|was|of|around|about|approximately|है|आहे)?\s*[:=]?\s*([₹Rs\.]*\s*[\d,]{4,12})\b",
        s_cleaned,
        re.IGNORECASE
    )
    if num_with_context:
        digits_only = re.sub(r"[^\d]", "", num_with_context.group(1))
        if len(digits_only) >= 4:
            num = int(digits_only)
            is_currency = bool(re.search(r"(?:Rs\.?|₹|inr|रुपये|रु\.)", num_with_context.group(0), re.IGNORECASE))
            if 1920 <= num <= 2030 and not is_currency and not is_monthly:
                # Implausible annual income that looks like a year
                pass
            else:
                final_val = num * 12 if is_monthly else num
                return final_val, "converted_from_monthly" if is_monthly else "annual"

    # Standard pure digit match between 4 and 8 digits (supporting commas like 20,000 or 2,50,000)
    all_raw_nums = re.findall(r"\b(\d{1,3}(?:,\d{2,3})+|\d{4,8})\b", s_cleaned)
    for n_str in all_raw_nums:
        digits_only = n_str.replace(",", "")
        n = int(digits_only)
        # Avoid treating birth year as income
        if 1920 <= n <= 2030 and not is_monthly:
            continue
        final_val = n * 12 if is_monthly else n
        return final_val, "converted_from_monthly" if is_monthly else "annual"

    return None, None

# ----------------------------------------------------
# 5. Date of Birth (DOB) Extractor
# ----------------------------------------------------

MONTH_MAP = {
    "january": 1, "jan": 1, "जनवरी": 1, "जानेवारी": 1,
    "february": 2, "feb": 2, "फरवरी": 2, "फेब्रुवारी": 2,
    "march": 3, "mar": 3, "मार्च": 3,
    "april": 4, "apr": 4, "अप्रैल": 4, "एप्रिल": 4,
    "may": 5, "मई": 5, "मे": 5,
    "june": 6, "jun": 6, "जून": 6,
    "july": 7, "jul": 7, "जुलाई": 7, "जुलै": 7,
    "august": 8, "aug": 8, "अगस्त": 8, "ऑगस्ट": 8,
    "september": 9, "sep": 9, "सितंबर": 9, "सप्टेंबर": 9,
    "october": 10, "oct": 10, "अक्टूबर": 10, "ऑक्टोबर": 10,
    "november": 11, "nov": 11, "नवंबर": 11, "नोव्हेंबर": 11,
    "december": 12, "dec": 12, "दिसंबर": 12, "डिसेंबर": 12
}

def extract_date_of_birth(text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extracts date of birth or birth year from text.
    Returns: (standardized_dob_string, dob_type: 'full' | 'year_only')
    """
    if not text:
        return None, None
    s = text.translate(DEVANAGARI_DIGITS_TRANS).lower()

    # Pattern 1: YYYY-MM-DD
    iso_match = re.search(r"\b(19\d\d|20[0-2]\d)[/-](0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])\b", s)
    if iso_match:
        y, m, d = int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3))
        return f"{y:04d}-{m:02d}-{d:02d}", "full"

    # Pattern 2: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    dmy_match = re.search(r"\b(0?[1-9]|[12]\d|3[01])[/\-.](0?[1-9]|1[0-2])[/\-.](19\d\d|20[0-2]\d)\b", s)
    if dmy_match:
        d, m, y = int(dmy_match.group(1)), int(dmy_match.group(2)), int(dmy_match.group(3))
        return f"{y:04d}-{m:02d}-{d:02d}", "full"

    # Pattern 3: Day + Month Word + Year (e.g. "15 August 2002", "15 अगस्त 2002", "१५ ऑगस्ट २००२")
    for month_name, month_num in MONTH_MAP.items():
        pattern = rf"\b(\d{{1,2}})(?:st|nd|rd|th)?\s+{month_name}\s+(19\d\d|20[0-2]\d)\b"
        m = re.search(pattern, s)
        if m:
            d = int(m.group(1))
            y = int(m.group(2))
            if 1 <= d <= 31:
                return f"{y:04d}-{month_num:02d}-{d:02d}", "full"

        pattern2 = rf"\b{month_name}\s+(\d{{1,2}})(?:st|nd|rd|th)?,?\s+(19\d\d|20[0-2]\d)\b"
        m2 = re.search(pattern2, s)
        if m2:
            d = int(m2.group(1))
            y = int(m2.group(2))
            if 1 <= d <= 31:
                return f"{y:04d}-{month_num:02d}-{d:02d}", "full"

    # Pattern 4: "born in 1986" or "born 1986" or "जन्म 1986" or "जन्म वर्ष 1986"
    birth_year_match = re.search(r"(?:born|birth|जन्म|साल|birth\s*year|year\s*of\s*birth|जन्म\s*वर्ष)\s+(?:in\s+)?(19\d\d|20[0-2]\d)\b", s)
    if birth_year_match:
        y = int(birth_year_match.group(1))
        return f"{y:04d}-01-01", "year_only"

    # Pattern 5: Standalone 4-digit year if preceded by "in 1986"
    in_year_match = re.search(r"\bin\s+(19\d\d|20[0-2]\d)\b", s)
    if in_year_match and not has_income_context(s):
        y = int(in_year_match.group(1))
        return f"{y:04d}-01-01", "year_only"

    return None, None

def derive_dob_from_age(age_val: int | None) -> str | None:
    if age_val is None or age_val <= 0 or age_val > 120:
        return None
    current_year = date.today().year
    birth_year = current_year - age_val
    return f"{birth_year}-01-01"
