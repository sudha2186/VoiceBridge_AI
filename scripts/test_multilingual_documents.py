# -*- coding: utf-8 -*-
"""
VoiceBridge AI — Multilingual Document OCR & Extraction Test Suite
Tests English, Hindi, and Marathi documents:
- Marathi Income Certificate (उत्पन्नाचा दाखला) with Devanagari numerals
- Marathi Caste Certificate (जातीचे प्रमाणपत्र) with category & caste
- Hindi Income Certificate (आय प्रमाण पत्र)
- English Income Certificate
- Corrupted / unreadable document handling
"""

import sys
import io
import json
import fitz # PyMuPDF
import requests

sys.stdout.reconfigure(encoding='utf-8')

API_URL = "http://localhost:8000/api/ocr/extract-pdf"

def create_synthetic_pdf(text_lines: list[str]) -> bytes:
    """Creates a selectable-text PDF in memory with Unicode characters."""
    doc = fitz.open()
    page = doc.new_page(width=595, height=842) # A4
    y = 50
    for line in text_lines:
        # PyMuPDF insert_text supports font fallback
        page.insert_text((50, y), line, fontsize=11)
        y += 24
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

def run_tests():
    print("==============================================================")
    print("  VOICEBRIDGE AI — MULTILINGUAL DOCUMENT OCR & EXTRACTION TEST")
    print("==============================================================")
    
    test_cases = [
        {
            "name": "1. Marathi Income Certificate (उत्पन्नाचा दाखला)",
            "doc_type": "Income Certificate",
            "profile": {"full_name": "रमेश विठ्ठल पाटील", "annual_income": 60000},
            "lines": [
                "महाराष्ट्र शासन - महसूल विभाग",
                "कार्यालय: तहसीलदार, ठाणे",
                "उत्पन्नाचा दाखला (Income Certificate)",
                "प्रमाणपत्र क्रमांक: REV/INC/2024/98765",
                "दिनांक: 15/04/2024",
                "प्रमाणित करण्यात येते की, अर्जदाराचे नाव: रमेश विठ्ठल पाटील",
                "राहिवासी: ठाणे, महाराष्ट्र",
                "सर्व मार्गांनी मिळून कुटुंबाचे वार्षिक उत्पन्न: रु. ६०,०००/- (अक्षरी साठ हजार रुपये मात्र)",
                "सदर दाखला वित्तीय वर्ष: २०२३-२०२४ करिता वैध आहे.",
                "सक्षम अधिकारी: तहसीलदार, ठाणे"
            ],
            "expect_extracted": {
                "income": 60000,
                "certificate_type": "income_certificate",
                "issuing_authority": "तहसीलदार"
            }
        },
        {
            "name": "2. Marathi Caste Certificate (जातीचे प्रमाणपत्र)",
            "doc_type": "Caste Certificate",
            "profile": {"full_name": "अनिकेत सूर्यवंशी", "category": "OBC"},
            "lines": [
                "महाराष्ट्र शासन - समाज कल्याण विभाग",
                "कार्यालय: उपविभागीय अधिकारी, पुणे",
                "जातीचे प्रमाणपत्र (Caste Certificate)",
                "प्रमाणपत्र क्रमांक: MAG/CC/2023/1234",
                "दिनांक: 10/01/2024",
                "प्रमाणित करण्यात येते की, श्री/श्रीमती: अनिकेत सूर्यवंशी",
                "राहिवासी: हवेली, पुणे",
                "प्रवर्ग: इतर मागास वर्ग (OBC)",
                "जात: कुणबी",
                "सक्षम अधिकारी: उपविभागीय अधिकारी, पुणे"
            ],
            "expect_extracted": {
                "category": "OBC",
                "caste": "कुणबी",
                "certificate_type": "caste_certificate"
            }
        },
        {
            "name": "3. Hindi Income Certificate (आय प्रमाण पत्र)",
            "doc_type": "Income Certificate",
            "profile": {"full_name": "राहुल कुमार वर्मा", "annual_income": 75000},
            "lines": [
                "उत्तर प्रदेश शासन - राजस्व विभाग",
                "कार्यालय: तहसीलदार, लखनऊ",
                "आय प्रमाण पत्र (Income Certificate)",
                "प्रमाण पत्र क्रमांक: UP/INC/2024/45678",
                "दिनांक: 20/03/2024",
                "प्रमाणित किया जाता है कि श्री/श्रीमती: राहुल कुमार वर्मा",
                "निवास: लखनऊ, उत्तर प्रदेश",
                "सभी स्रोतों से कुल वार्षिक आय: ₹75,000/- (पचहत्तर हजार रुपये)",
                "वित्तीय वर्ष: 2023-2024 के लिए मान्य",
                "सक्षम प्राधिकारी: तहसीलदार"
            ],
            "expect_extracted": {
                "income": 75000,
                "certificate_type": "income_certificate"
            }
        },
        {
            "name": "4. English Income Certificate",
            "doc_type": "Income Certificate",
            "profile": {"full_name": "Rajesh Sharma", "annual_income": 120000},
            "lines": [
                "Government of Maharashtra - Revenue Department",
                "Office of the Tahsildar, District Pune",
                "Income Certificate",
                "Certificate No: MH/INC/2024/00889",
                "Date: 05/02/2024",
                "This is to certify that: Rajesh Sharma",
                "Resident of: Pune, Maharashtra",
                "Annual Family Income from all sources is Rs. 1,20,000/- (One Lakh Twenty Thousand Only)",
                "Valid for Financial Year: 2023-2024",
                "Issuing Authority: Tahsildar"
            ],
            "expect_extracted": {
                "income": 120000,
                "certificate_type": "income_certificate"
            }
        },
        {
            "name": "5. Corrupted / Empty Unreadable Document",
            "doc_type": "Income Certificate",
            "profile": {"full_name": "Test User"},
            "lines": [], # Empty page
            "expect_extracted": {
                "expected_status": ["failed", "needs_review"]
            }
        }
    ]

    all_passed = True

    for tc in test_cases:
        print(f"\n--- Testing: {tc['name']} ---")
        pdf_bytes = create_synthetic_pdf(tc["lines"])
        
        files = {
            "file": ("test_doc.pdf", pdf_bytes, "application/pdf")
        }
        data = {
            "document_type": tc["doc_type"],
            "citizen_profile": json.dumps(tc["profile"], ensure_ascii=False)
        }

        try:
            resp = requests.post(API_URL, files=files, data=data, timeout=10)
            res_json = resp.json()
            
            if not res_json.get("success") and "expected_status" not in tc.get("expect_extracted", {}):
                print(f"  ❌ FAILED: API returned failure: {res_json.get('error')}")
                all_passed = False
                continue

            extracted = res_json.get("extracted_data", {})
            v_status = res_json.get("verification_status")
            f_comps = res_json.get("field_comparisons", {})
            
            print(f"  Result Status: {v_status}")
            print(f"  Extracted Fields: {extracted}")
            if f_comps:
                print(f"  Field Comparisons: {f_comps}")

            # Verify expected extractions
            tc_expected = tc.get("expect_extracted", {})
            for exp_k, exp_v in tc_expected.items():
                if exp_k == "expected_status":
                    if v_status not in exp_v:
                        print(f"  ❌ FAILED: Expected verification status in {exp_v}, got {v_status}")
                        all_passed = False
                    else:
                        print(f"  ✓ Pass: Correct error/review state triggered ({v_status})")
                elif exp_k == "income":
                    act_inc = extracted.get("income")
                    if act_inc == exp_v:
                        print(f"  ✓ Pass: Extracted income matches {exp_v}")
                    else:
                        print(f"  ❌ FAILED: Expected income {exp_v}, got {act_inc}")
                        all_passed = False
                elif exp_k == "category":
                    act_cat = extracted.get("category")
                    if act_cat == exp_v:
                        print(f"  ✓ Pass: Extracted category matches {exp_v}")
                    else:
                        print(f"  ❌ FAILED: Expected category {exp_v}, got {act_cat}")
                        all_passed = False
                elif exp_k == "caste":
                    act_caste = extracted.get("caste")
                    if act_caste == exp_v:
                        print(f"  ✓ Pass: Extracted caste matches {exp_v}")
                    else:
                        print(f"  ❌ FAILED: Expected caste {exp_v}, got {act_caste}")
                        all_passed = False
                elif exp_k == "certificate_type":
                    act_ct = extracted.get("certificate_type")
                    if act_ct == exp_v:
                        print(f"  ✓ Pass: Extracted certificate type matches {exp_v}")
                    else:
                        print(f"  ❌ FAILED: Expected certificate type {exp_v}, got {act_ct}")
                        all_passed = False

        except Exception as e:
            print(f"  ❌ FAILED with exception: {e}")
            all_passed = False

    print("\n==============================================================")
    if all_passed:
        print("  ALL 5 MULTILINGUAL DOCUMENT OCR TEST CASES PASSED! ✓")
    else:
        print("  SOME MULTILINGUAL DOCUMENT OCR TEST CASES FAILED! ❌")
    print("==============================================================")
    return all_passed

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
