import re
import fitz

def extract_pdf_data(pdf_bytes, profile_name=None, profile_dob=None, doc_type="Aadhaar Card"):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_texts = [page.get_text() for page in doc]
    raw_text = "\n".join(page_texts).strip()

    extracted = {
        "name": None,
        "dob": None,
        "document_number": None,
        "income": None,
        "address": None,
        "raw_text_snippet": raw_text[:300] if raw_text else ""
    }

    # 1. Name extraction
    name_match = re.search(r"(?:Name|नाव|नाम)\s*[:\-\u2013]?\s*([A-Za-z\u0900-\u097F\s]{3,40})", raw_text, re.IGNORECASE)
    if name_match:
        extracted["name"] = name_match.group(1).strip()
    elif profile_name and profile_name.lower() in raw_text.lower():
        extracted["name"] = profile_name

    # 2. DOB extraction
    dob_match = re.search(r"(?:DOB|Date of Birth|जन्मतारीख|जन्म तिथि)\s*[:\-\u2013]?\s*(\d{2}[/\-]\d{2}[/\-]\d{4}|\d{4}[/\-]\d{2}[/\-]\d{2})", raw_text, re.IGNORECASE)
    if dob_match:
        extracted["dob"] = dob_match.group(1).strip()
    else:
        any_date = re.search(r"\b(\d{2}[/\-]\d{2}[/\-]\d{4})\b", raw_text)
        if any_date:
            extracted["dob"] = any_date.group(1).strip()

    # 3. Document number
    if "aadhaar" in doc_type.lower():
        a_match = re.search(r"\b([X\d]{4}\s?[X\d]{4}\s?\d{4})\b", raw_text)
        if a_match:
            extracted["document_number"] = a_match.group(1).strip()
    elif "pan" in doc_type.lower():
        p_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", raw_text)
        if p_match:
            extracted["document_number"] = p_match.group(1).strip()
    else:
        num_match = re.search(r"(?:Certificate No|Cert No|Reg No|Acc No|Account No|क्रमांक)\s*[:\-\u2013]?\s*([A-Za-z0-9\-_/]{6,25})", raw_text, re.IGNORECASE)
        if num_match:
            extracted["document_number"] = num_match.group(1).strip()

    # 4. Income
    inc_match = re.search(r"(?:Rs\.?|₹|INR|आय|वार्षिक उत्पन्न)\s*[:\-\u2013]?\s*([\d,]+)", raw_text, re.IGNORECASE)
    if inc_match:
        extracted["income"] = inc_match.group(1).replace(",", "").strip()

    # Verification
    name_matched = False
    dob_matched = False
    details = []

    if profile_name and extracted["name"]:
        tokens_p = set(profile_name.lower().split())
        tokens_e = set(extracted["name"].lower().split())
        if tokens_p & tokens_e:
            name_matched = True
            details.append(f"Name matched: '{extracted['name']}' matches profile name '{profile_name}'.")
        else:
            details.append(f"Name discrepancy: extracted '{extracted['name']}' vs profile '{profile_name}'.")

    if profile_dob and extracted["dob"]:
        # Standardize YYYY-MM-DD vs DD/MM/YYYY
        clean_p = profile_dob.replace("/", "-")
        clean_e = extracted["dob"].replace("/", "-")
        parts_e = clean_e.split("-")
        if len(parts_e) == 3 and len(parts_e[0]) == 2: # DD-MM-YYYY -> YYYY-MM-DD
            clean_e = f"{parts_e[2]}-{parts_e[1]}-{parts_e[0]}"
        if clean_p == clean_e:
            dob_matched = True
            details.append(f"Date of birth verified: {extracted['dob']}.")
        else:
            details.append(f"DOB discrepancy: extracted '{extracted['dob']}' vs profile '{profile_dob}'.")

    if name_matched or dob_matched:
        status = "verified"
    elif extracted["name"] or extracted["document_number"]:
        status = "needs_review" if (profile_name or profile_dob) else "extracted"
    elif raw_text:
        status = "extracted"
    else:
        status = "failed"
        details.append("No selectable text could be extracted from PDF.")

    return {
        "success": status != "failed",
        "extracted_data": extracted,
        "verification": {
            "status": status,
            "name_match": name_matched,
            "dob_match": dob_matched,
            "details": details,
            "disclaimer": "Text consistency check against profile details completed. Official authenticity requires government issuing authority verification."
        }
    }

# Test with a generated dummy PDF
doc = fitz.open()
page = doc.new_page()
page.insert_text((50, 72), "GOVERNMENT OF INDIA\nName: Rajesh Kumar Sharma\nDOB: 15/05/1990\nAadhaar: 1234 5678 9012\nState: Maharashtra")
test_bytes = doc.tobytes()

result = extract_pdf_data(test_bytes, profile_name="Rajesh Sharma", profile_dob="1990-05-15")
print("Test PDF Result:", result)
