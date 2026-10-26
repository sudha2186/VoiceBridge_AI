import re
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

DEVANAGARI_DIGITS = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
}

def devanagari_to_ascii_digits(text: str) -> str:
    """Converts Devanagari numerals (०-९) to ASCII digits (0-9)."""
    if not text:
        return ""
    result = []
    for ch in text:
        result.append(DEVANAGARI_DIGITS.get(ch, ch))
    return "".join(result)

def clean_extracted_name(name_str: str) -> str | None:
    if not name_str:
        return None
    cand = re.sub(r"^(?:Name|नाव|नाम|Shri|Smt|Mr|Ms|Mrs|Dr|श्री|श्रीमती|कुमार|कुमारी|रा\.)\s*[:\-\u2013.]?\s*", "", name_str.strip(), flags=re.IGNORECASE)
    cand = re.sub(r"(?:DOB|Date of Birth|Gender|Male|Female|S/O|D/O|W/O|C/O|Address|Aadhaar|आत्मज|पुत्र|मुलगा|मुलगी).*", "", cand, flags=re.IGNORECASE)
    cand = re.sub(r"[^\w\s\u0900-\u097F]", " ", cand).strip()
    cand = re.sub(r"\s+", " ", cand).strip()
    if len(cand) >= 3 and not re.search(r"(?:Government|India|सरकार|भारत|UIDAI|Authority|Commission|महाराष्ट्र|तहसील|कार्यालय)", cand, re.IGNORECASE):
        if re.search(r"[A-Za-z]", cand):
            return cand.title()
        return cand
    return None

def parse_income_certificate(raw_text: str) -> dict:
    normalized_text = devanagari_to_ascii_digits(raw_text)
    data = {
        "document_type": "Income Certificate",
        "applicant_name": None,
        "income_amount": None,
        "financial_year": None,
        "issuing_authority": None,
        "certificate_number": None,
        "issue_date": None,
        "valid_until": None,
        "income_owner": "self"
    }

    # 1. Certificate Number / जावक क्रमांक / बारकोड
    cert_no_m = re.search(
        r"(?:प्रमाणपत्र\s*क्रमांक|जावक\s*क्रमांक|जावक\s*क्र\.?|अर्ज\s*क्रमांक|बारकोड|टोकन\s*क्र\.?|Certificate\s*No\.?|Application\s*No\.?|Cert\s*No\.?)\s*[:\-\u2013.]?\s*([A-Za-z0-9\-_/]{5,30})",
        normalized_text,
        re.IGNORECASE
    )
    if cert_no_m:
        data["certificate_number"] = cert_no_m.group(1).strip()
    else:
        token_m = re.search(r"\b(\d{16,22})\b", normalized_text)
        if token_m:
            data["certificate_number"] = token_m.group(1).strip()

    # 2. Applicant Name
    name_m = re.search(
        r"(?:अर्जदाराचे\s*नाव|आवेदक\s*का\s*नाम|Applicant\s*Name|Name\s*of\s*Applicant)\s*[:\-\u2013.]?\s*([A-Za-z\u0900-\u097F\s]{3,45})",
        normalized_text,
        re.IGNORECASE
    )
    if name_m:
        data["applicant_name"] = clean_extracted_name(name_m.group(1))
    else:
        certify_m = re.search(
            r"(?:प्रमाणित\s*करण्यात\s*येते\s*की\s*,?\s*(?:श्री|श्रीमती|कुमार|कुमारी)?\s*|प्रमाणित\s*किया\s*जाता\s*है\s*कि\s*(?:श्री|श्रीमती|कुमारी)?\s*|This\s*is\s*to\s*certify\s*that\s*(?:Shri|Smt|Kumari)?\s*)([A-Za-z\u0900-\u097F\s]{3,40}?)(?:,?\s*रा\.|\s+रा\.|\s+राहणार|,?\s*निवासी|\s+आत्मज|\s+पुत्र|\s+S/o|\s+D/o|\s+W/o|\s+यांचे|\s+इनकी|,?\s*resident|\s+is\s+a\s+resident)",
            normalized_text,
            re.IGNORECASE
        )
        if certify_m:
            data["applicant_name"] = clean_extracted_name(certify_m.group(1))

    # 3. Income Amount
    inc_m = re.search(
        r"(?:एकूण\s*वार्षिक\s*उत्पन्न|वार्षिक\s*उत्पन्न|सर्व\s*मार्गांनी\s*मिळणारे\s*उत्पन्न|वार्षिक\s*आय|कुल\s*वार्षिक\s*आय|Annual\s*Income|Total\s*Income|total\s*annual\s*income)\s*(?:of)?\s*(?:रु\.?|₹|INR|Rs\.?)?\s*[:\-\u2013.]?\s*(?:रु\.?|₹|Rs\.?)?\s*([\d,]+)",
        normalized_text,
        re.IGNORECASE
    )
    if inc_m:
        raw_val = inc_m.group(1).replace(",", "").strip()
        if raw_val.isdigit():
            data["income_amount"] = int(raw_val)
    else:
        any_inc = re.search(r"(?:रु\.?|₹|Rs\.?)\s*([\d,]{4,10})\s*/?\-?", normalized_text)
        if any_inc:
            raw_val = any_inc.group(1).replace(",", "").strip()
            if raw_val.isdigit():
                data["income_amount"] = int(raw_val)

    # 4. Financial Year / Validity Period
    fy_m = re.search(
        r"(?:आर्थिक\s*वर्ष|वित्तीय\s*वर्ष|चालू\s*आर्थिक\s*वर्ष|Financial\s*Year|FY)\s*[:\-\u2013.]?\s*(\d{4}\s*[-–/]\s*\d{2,4})",
        normalized_text,
        re.IGNORECASE
    )
    if fy_m:
        data["financial_year"] = fy_m.group(1).replace(" ", "")

    # 5. Issuing Authority
    auth_m = re.search(
        r"(तहसीलदार|नायब\s*तहसीलदार|उपविभागीय\s*अधिकारी|सक्षम\s*प्राधिकारी|तालुका\s*दंडाधिकारी|Tahsildar|Tehsildar|Sub[\s\-]Divisional\s*Officer|Executive\s*Magistrate|District\s*Magistrate|Revenue\s*Officer)",
        normalized_text,
        re.IGNORECASE
    )
    if auth_m:
        data["issuing_authority"] = auth_m.group(1).strip()

    # 6. Issue Date
    date_m = re.search(
        r"(?:दिनांक|तारीख|Date\s*of\s*Issue|Date)\s*[:\-\u2013.]?\s*(\d{2}[/\-.]\d{2}[/\-.]\d{4})",
        normalized_text,
        re.IGNORECASE
    )
    if date_m:
        parts = date_m.group(1).replace(".", "-").replace("/", "-").split("-")
        if len(parts) == 3:
            data["issue_date"] = f"{int(parts[2]):04d}-{int(parts[1]):02d}-{int(parts[0]):02d}"

    # 7. Whose Income
    if re.search(r"(?:पालक|वडील|आई|कुटुंब|पिता|माता|Guardian|Parent|Father|Mother|Family)", normalized_text, re.IGNORECASE):
        if not re.search(r"(?:स्वतःचे|खुद\s*का|Own|Self)", normalized_text, re.IGNORECASE):
            data["income_owner"] = "guardian"

    return data

def parse_caste_certificate(raw_text: str) -> dict:
    normalized_text = devanagari_to_ascii_digits(raw_text)
    data = {
        "document_type": "Caste Certificate",
        "applicant_name": None,
        "category": None,
        "caste": None,
        "certificate_number": None,
        "issuing_authority": None,
        "issue_date": None
    }

    # 1. Certificate Number
    cert_no_m = re.search(
        r"(?:प्रमाणपत्र\s*क्रमांक|अनुक्रमांक|जावक\s*क्रमांक|जावक\s*क्र\.?|बारकोड|Certificate\s*No\.?|Application\s*No\.?)\s*[:\-\u2013.]?\s*([A-Za-z0-9\-_/]{5,30})",
        normalized_text,
        re.IGNORECASE
    )
    if cert_no_m:
        data["certificate_number"] = cert_no_m.group(1).strip()
    else:
        token_m = re.search(r"\b(\d{16,22})\b", normalized_text)
        if token_m:
            data["certificate_number"] = token_m.group(1).strip()

    # 2. Applicant Name
    name_m = re.search(
        r"(?:अर्जदाराचे\s*नाव|आवेदक\s*का\s*नाम|Applicant\s*Name)\s*[:\-\u2013.]?\s*([A-Za-z\u0900-\u097F\s]{3,45})",
        normalized_text,
        re.IGNORECASE
    )
    if name_m:
        data["applicant_name"] = clean_extracted_name(name_m.group(1))
    else:
        certify_m = re.search(
            r"(?:प्रमाणित\s*करण्यात\s*येते\s*की\s*,?\s*(?:श्री|श्रीमती|कुमार|कुमारी)?\s*|प्रमाणित\s*किया\s*जाता\s*है\s*कि\s*(?:श्री|श्रीमती|कुमारी)?\s*|This\s*is\s*to\s*certify\s*that\s*(?:Shri|Smt|Kumari)?\s*)([A-Za-z\u0900-\u097F\s]{3,40}?)(?:,?\s*रा\.|\s+रा\.|\s+राहणार|,?\s*निवासी|\s+आत्मज|\s+पुत्र|\s+S/o|\s+D/o|\s+W/o|\s+हे|\s+या|\s+belonging)",
            normalized_text,
            re.IGNORECASE
        )
        if certify_m:
            data["applicant_name"] = clean_extracted_name(certify_m.group(1))

    # 3. Category / Caste
    if re.search(r"(?:इतर\s*मागास\s*वर्ग|अन्य\s*पिछड़ा\s*वर्ग|Other\s*Backward\s*Class|OBC)\b", normalized_text, re.IGNORECASE):
        data["category"] = "OBC"
    elif re.search(r"(?:अनुसूचित\s*जाती|अनुसूचित\s*जाति|Scheduled\s*Caste|SC)\b", normalized_text, re.IGNORECASE):
        data["category"] = "SC"
    elif re.search(r"(?:अनुसूचित\s*जमाती|अनुसूचित\s*जनजाति|Scheduled\s*Tribe|ST)\b", normalized_text, re.IGNORECASE):
        data["category"] = "ST"
    elif re.search(r"(?:विमुक्त\s*जाती|भटक्या\s*जमाती|VJNT|NT)\b", normalized_text, re.IGNORECASE):
        data["category"] = "OBC"
    elif re.search(r"(?:आर्थिकदृष्ट्या\s*दुर्बल|EWS)\b", normalized_text, re.IGNORECASE):
        data["category"] = "EWS"
    elif re.search(r"(?:सामान्य|खुला|General)\b", normalized_text, re.IGNORECASE):
        data["category"] = "General"

    # Specific caste name e.g. "कुणबी", "मराठा", etc. (avoid matching "जातीचे प्रमाणपत्र")
    caste_m = re.search(
        r"(?:प्रवर्गातील|जातीचे\s*असून\s*ती\s*जात|जात\s*:|जाति\s*:|Caste\s*:)\s*([A-Za-z\u0900-\u097F]{3,20})",
        normalized_text,
        re.IGNORECASE
    )
    if caste_m:
        data["caste"] = caste_m.group(1).strip()

    # 4. Issuing Authority
    auth_m = re.search(
        r"(उपविभागीय\s*अधिकारी|सक्षम\s*प्राधिकारी|तहसीलदार|Sub[\s\-]Divisional\s*Officer|Executive\s*Magistrate|District\s*Magistrate)",
        normalized_text,
        re.IGNORECASE
    )
    if auth_m:
        data["issuing_authority"] = auth_m.group(1).strip()

    # 5. Issue Date
    date_m = re.search(
        r"(?:दिनांक|तारीख|Date\s*of\s*Issue|Date)\s*[:\-\u2013.]?\s*(\d{2}[/\-.]\d{2}[/\-.]\d{4})",
        normalized_text,
        re.IGNORECASE
    )
    if date_m:
        parts = date_m.group(1).replace(".", "-").replace("/", "-").split("-")
        if len(parts) == 3:
            data["issue_date"] = f"{int(parts[2]):04d}-{int(parts[1]):02d}-{int(parts[0]):02d}"

    return data

marathi_income_sample = """
महाराष्ट्र शासन - महसूल विभाग
तहसीलदार कार्यालय ठाणे
उत्पन्नाचा दाखला
प्रमाणपत्र क्रमांक: MRC/2024/78912345
दिनांक: १५/०७/२०२४

प्रमाणित करण्यात येते की, श्री राहुल रमेश शर्मा, रा. नौपाडा, ठाणे (पश्चिम), जि. ठाणे यांचे सर्व मार्गांनी मिळणारे चालू आर्थिक वर्ष २०२३-२४ चे एकूण वार्षिक उत्पन्न रु. ५०,०००/- (अक्षरी पन्नास हजार रुपये फक्त) इतके आहे.

सदर दाखला अर्जदाराच्या विनंतीवरून शैक्षणिक सवलतीसाठी देण्यात येत आहे.

तहसीलदार ठाणे
सक्षम प्राधिकारी
"""

hindi_income_sample = """
उत्तर प्रदेश शासन - राजस्व विभाग
कार्यालय तहसीलदार, लखनऊ
आय प्रमाण पत्र
प्रमाणपत्र क्रमांक: UP-INC-2024-987654
दिनांक: 10/06/2024

प्रमाणित किया जाता है कि श्री अमित कुमार वर्मा, निवासी गोमती नगर, लखनऊ की सभी स्रोतों से कुल वार्षिक आय रु. 75,000/- (अक्षरी पचहत्तर हजार रुपये) है। यह प्रमाण पत्र वित्तीय वर्ष 2024-2025 के लिए मान्य है।

तहसीलदार, लखनऊ
"""

marathi_caste_sample = """
महाराष्ट्र शासन
उपविभागीय अधिकारी तथा सक्षम प्राधिकारी, ठाणे उपविभाग, ठाणे
जातीचे प्रमाणपत्र
प्रमाणपत्र क्रमांक: CAST/THN/2023/456789
दिनांक: २०/१२/२०२३

प्रमाणित करण्यात येते की, श्री राहुल रमेश शर्मा, रा. ठाणे हे इतर मागास वर्ग (OBC) या प्रवर्गातील कुणबी जातीचे आहेत.
सदर जात ही महाराष्ट्र शासनाच्या अधिसूचनेनुसार इतर मागास वर्ग म्हणून घोषित करण्यात आलेली आहे.

उपविभागीय अधिकारी
ठाणे उपविभाग, ठाणे
"""

english_income_sample = """
Government of Maharashtra - Revenue Department
Office of the Tahsildar, Pune
INCOME CERTIFICATE
Certificate No.: INC-PUN-2024-34567
Date of Issue: 25/08/2024

This is to certify that Shri Amol Patil, resident of Shivajinagar, Pune has a total annual income of Rs. 1,20,000/- from all sources for the Financial Year 2023-2024.

Tahsildar, Pune
"""

print("=== MARATHI INCOME CERTIFICATE ===")
res_mi = parse_income_certificate(marathi_income_sample)
print(json.dumps(res_mi, indent=2, ensure_ascii=False))

print("\n=== HINDI INCOME CERTIFICATE ===")
res_hi = parse_income_certificate(hindi_income_sample)
print(json.dumps(res_hi, indent=2, ensure_ascii=False))

print("\n=== MARATHI CASTE CERTIFICATE ===")
res_mc = parse_caste_certificate(marathi_caste_sample)
print(json.dumps(res_mc, indent=2, ensure_ascii=False))

print("\n=== ENGLISH INCOME CERTIFICATE ===")
res_ei = parse_income_certificate(english_income_sample)
print(json.dumps(res_ei, indent=2, ensure_ascii=False))
