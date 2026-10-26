import sys
import os
import re

sys.stdout.reconfigure(encoding='utf-8')

# Import existing CANONICAL_DISTRICTS and CANONICAL_STATES
sys.path.insert(0, os.path.abspath('ai_service'))
from normalizers import CANONICAL_DISTRICTS, CANONICAL_STATES, DISTRICT_TO_STATE

# Enhanced dictionary with common ASR variations
ENHANCED_DISTRICTS = dict(CANONICAL_DISTRICTS)
ENHANCED_DISTRICTS.update({
    "थाने": "Thane", "थाणे": "Thane", "ठाने": "Thane", "thane": "Thane", "thana": "Thane",
    "पुने": "Pune", "पुण्यात": "Pune", "पुण्यामध्ये": "Pune",
    "नासिक": "Nashik", "नाशिक": "Nashik", "नाशिकमध्ये": "Nashik",
    "नागपुर": "Nagpur", "नागपूर": "Nagpur",
    "संभाजीनगर": "Chhatrapati Sambhajinagar", "छत्रपती संभाजीनगर": "Chhatrapati Sambhajinagar",
    "औरंगाबाद": "Chhatrapati Sambhajinagar",
    "अहिल्यानगर": "Ahilyanagar", "अहमदनगर": "Ahilyanagar",
    "धाराशिव": "Dharashiv", "उस्मानाबाद": "Dharashiv",
    "जलगांव": "Jalgaon", "जळगाव": "Jalgaon",
    "धुले": "Dhule", "धुलिया": "Dhule", "धुळे": "Dhule",
    "रायगढ": "Raigad", "रायगड": "Raigad",
    "बुलडाणा": "Buldhana", "बुलढाणा": "Buldhana",
    "गोन्दिया": "Gondia", "गोंदिया": "Gondia",
    "यवतमाल": "Yavatmal", "यवतमाळ": "Yavatmal",
    "कोल्हापुर": "Kolhapur", "कोल्हापूर": "Kolhapur",
    "सोलापुर": "Solapur", "सोलापूर": "Solapur",
    "अमरावती": "Amravati", "अमरावतीमध्ये": "Amravati",
    "वाशीम": "Washim", "वाशिम": "Washim",
    "परभनी": "Parbhani", "परभणी": "Parbhani",
    "नांदेड़": "Nanded", "नांदेड": "Nanded",
    "लातुर": "Latur", "लातूर": "Latur",
    "नन्दुरबार": "Nandurbar", "नंदुरबार": "Nandurbar"
})

def improved_extract_state_and_district(text: str, ner_entities: dict = None, lang: str = "en"):
    ner_entities = ner_entities or {}
    sources = {}
    district = None
    state = None
    text_clean = text.strip()
    text_lower = text_clean.lower()

    # 1A. Pattern: Keyword BEFORE District Name
    # e.g. "My district is Thane", "जिला ठाणे", "मेरा जिला ठाणे है", "माझा जिल्हा ठाणे आहे"
    kw_first_pattern = re.search(
        r"(?:district(?:\s+is)?|district\s*name\s*is|जिला(?:\s*[:\-]?|\s+है)?|जिले(?:\s*[:\-]?|\s+का\s*नाम)?|जिल्हा(?:\s*[:\-]?|\s+आहे)?|जिल्ह्याचे\s*नाव)\s*[:\-\u2013]?\s*([A-Za-z\u0900-\u097F]+)",
        text_clean,
        re.IGNORECASE
    )
    if kw_first_pattern:
        cand = kw_first_pattern.group(1).strip().lower()
        if cand in ENHANCED_DISTRICTS:
            district = ENHANCED_DISTRICTS[cand]
            sources["district"] = "rule_district_pattern_kw_first"

    # 1B. Pattern: District Name BEFORE Keyword
    # e.g. "Thane district", "ठाणे जिले", "ठाणे जिल्ह्यात", "पुणे जिल्हा"
    if not district:
        kw_after_pattern = re.search(
            r"([A-Za-z\u0900-\u097F]+)\s*(?:district|जिला|जिले|जिल्हा|जिल्ह्यात|मध्ये)\b",
            text_clean,
            re.IGNORECASE
        )
        if kw_after_pattern:
            cand = kw_after_pattern.group(1).strip().lower()
            if cand in ENHANCED_DISTRICTS:
                district = ENHANCED_DISTRICTS[cand]
                sources["district"] = "rule_district_pattern_kw_after"

    # 2. Check from NER model output if present
    ner_dist = ner_entities.get("DISTRICT") or ner_entities.get("LOCATION")
    if not district and ner_dist:
        for k, v in ENHANCED_DISTRICTS.items():
            if k.lower() in ner_dist.lower():
                district = v
                sources["district"] = "model_ner_loc"
                break

    # 3. Direct dictionary scan with boundary / token check
    if not district:
        # Sort keys by length descending to match longest phrases first (e.g. 'छत्रपती संभाजीनगर' before 'संभाजीनगर')
        sorted_keys = sorted(ENHANCED_DISTRICTS.keys(), key=len, reverse=True)
        for k in sorted_keys:
            k_lower = k.lower()
            # Match word boundary for English, or substring with space/punctuation boundary for Devanagari
            if re.search(rf"(?:^|[^\w\u0900-\u097F]){re.escape(k_lower)}(?:$|[^\w\u0900-\u097F])", text_lower):
                district = ENHANCED_DISTRICTS[k]
                sources["district"] = "rule_pattern"
                break

    # 4. Extract State
    ner_state = ner_entities.get("STATE")
    if ner_state:
        for k, v in CANONICAL_STATES.items():
            if k.lower() in ner_state.lower():
                state = v
                sources["state"] = "model_ner_state"
                break

    if not state:
        for k, v in CANONICAL_STATES.items():
            if re.search(rf"\b{re.escape(k.lower())}\b", text_lower) if re.match(r"^[a-zA-Z\s]+$", k) else (k.lower() in text_lower):
                state = v
                sources["state"] = "rule_pattern"
                break

    # 5. State-District Consistency Validation & Inference
    if district and not state:
        if district in DISTRICT_TO_STATE:
            state = DISTRICT_TO_STATE[district]
            sources["state"] = "rule_district_inference"
    elif district and state:
        expected_state = DISTRICT_TO_STATE.get(district)
        if expected_state and expected_state != state:
            sources["geo_note"] = f"District {district} belongs to {expected_state}; text also mentioned {state}."

    return state, district, sources

test_phrases = [
    ('en', 'My district is Thane.'),
    ('en', 'I reside in Pune district.'),
    ('hi', 'मेरा जिला ठाणे है।'),
    ('hi', 'मेरा जिला थाने है।'),
    ('hi', 'मैं ठाणे जिले में रहता हूँ।'),
    ('mr', 'माझा जिल्हा ठाणे आहे.'),
    ('mr', 'मी पुणे जिल्ह्यात राहतो.'),
    ('mr', 'माझा जिल्हा नाशिक आहे.'),
    ('hi', 'मेरा जिला लखनऊ है।'),
    ('en', 'I am from Nagpur district, Maharashtra.')
]

print("=== IMPROVED DISTRICT EXTRACTION TEST ===")
all_passed = True
for lang, p in test_phrases:
    st, dist, src = improved_extract_state_and_district(p, {}, lang)
    print(f'[{lang}] "{p}" -> Dist: {dist}, State: {st}, Src: {src.get("district")}')
    if not dist:
        all_passed = False
        print(f"FAILED on: {p}")

print("\nAll phrases successfully extracted district:", all_passed)
