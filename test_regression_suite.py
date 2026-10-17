"""
VoiceBridge AI — Comprehensive Regression & Verification Suite
Tests all 12 regression test cases across NLP, normalizers, and document verification.
"""

import sys
import os
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_case_1():
    print("\n--- Test Case 1: English 1986 birth year + 2 lakh income + Thane ---")
    payload = {
        "text": "I was born in 1986 and my annual income is two lakh rupees. I live in Thane.",
        "language": "en"
    }
    r = requests.post(f"{BASE_URL}/api/nlp/extract", json=payload).json()
    fields = r["extracted_fields"]
    print("Extracted fields:", fields)
    assert fields["date_of_birth"] == "1986-01-01", f"Expected 1986-01-01, got {fields['date_of_birth']}"
    assert fields["annual_income"] == 200000, f"Expected 200000, got {fields['annual_income']}"
    assert fields["district"] == "Thane", f"Expected Thane, got {fields['district']}"
    assert fields["state"] == "Maharashtra", f"Expected Maharashtra, got {fields['state']}"
    assert fields["state"] != "Uttar Pradesh", "State must NOT be Uttar Pradesh (rupees bug check)"
    print("PASS: Case 1")

def test_case_2():
    print("\n--- Test Case 2: Hindi 1986 birth year + 2 lakh income + Thane ---")
    payload = {
        "text": "मेरा जन्म 1986 में हुआ था और मेरी वार्षिक आय दो लाख रुपये है। मैं ठाणे जिले में रहता हूँ।",
        "language": "hi"
    }
    r = requests.post(f"{BASE_URL}/api/nlp/extract", json=payload).json()
    fields = r["extracted_fields"]
    print("Extracted fields:", fields)
    assert fields["date_of_birth"] == "1986-01-01", f"Expected 1986-01-01, got {fields['date_of_birth']}"
    assert fields["annual_income"] == 200000, f"Expected 200000, got {fields['annual_income']}"
    assert fields["district"] == "Thane", f"Expected Thane, got {fields['district']}"
    assert fields["state"] == "Maharashtra", f"Expected Maharashtra, got {fields['state']}"
    assert fields.get("full_name") != "महाराष्ट्र के", f"Full name must NOT be 'महाराष्ट्र के', got {fields.get('full_name')}"
    print("PASS: Case 2")

def test_case_3():
    print("\n--- Test Case 3: Marathi 1986 birth year + 2 lakh income + Thane ---")
    payload = {
        "text": "माझा जन्म १९८६ मध्ये झाला आणि माझे वार्षिक उत्पन्न दोन लाख रुपये आहे. मी ठाणे जिल्ह्यात राहतो.",
        "language": "mr"
    }
    r = requests.post(f"{BASE_URL}/api/nlp/extract", json=payload).json()
    fields = r["extracted_fields"]
    print("Extracted fields:", fields)
    assert fields["date_of_birth"] == "1986-01-01", f"Expected 1986-01-01, got {fields['date_of_birth']}"
    assert fields["annual_income"] == 200000, f"Expected 200000, got {fields['annual_income']}"
    assert fields["district"] == "Thane", f"Expected Thane, got {fields['district']}"
    assert fields["state"] == "Maharashtra", f"Expected Maharashtra, got {fields['state']}"
    assert fields.get("full_name") != "महाराष्ट्र के", f"Full name must NOT be 'महाराष्ट्र के', got {fields.get('full_name')}"
    print("PASS: Case 3")

def test_case_4():
    print("\n--- Test Case 4: Text with 'rupees' without state mention ---")
    payload = {
        "text": "My income is 50000 rupees. I am a student.",
        "language": "en"
    }
    r = requests.post(f"{BASE_URL}/api/nlp/extract", json=payload).json()
    fields = r["extracted_fields"]
    print("Extracted fields:", fields)
    assert fields["state"] != "Uttar Pradesh", "State must NOT be Uttar Pradesh"
    assert fields["state"] is None, f"Expected None state, got {fields['state']}"
    assert fields["annual_income"] == 50000, f"Expected 50000, got {fields['annual_income']}"
    print("PASS: Case 4")

def test_case_5():
    print("\n--- Test Case 5: Monthly salary conversion (20,000 * 12 = 240,000) ---")
    payload = {
        "text": "my monthly salary is 20,000 rupees",
        "language": "en"
    }
    r = requests.post(f"{BASE_URL}/api/nlp/extract", json=payload).json()
    fields = r["extracted_fields"]
    print("Extracted fields:", fields)
    assert fields["annual_income"] == 240000, f"Expected 240000, got {fields['annual_income']}"
    print("PASS: Case 5")

def test_case_6():
    print("\n--- Test Case 6: Full DOB 15/08/1990 + Income 350000 ---")
    payload = {
        "text": "I was born on 15/08/1990 and my annual income is 350000 rupees.",
        "language": "en"
    }
    r = requests.post(f"{BASE_URL}/api/nlp/extract", json=payload).json()
    fields = r["extracted_fields"]
    print("Extracted fields:", fields)
    assert fields["date_of_birth"] == "1990-08-15", f"Expected 1990-08-15, got {fields['date_of_birth']}"
    assert fields["annual_income"] == 350000, f"Expected 350000, got {fields['annual_income']}"
    print("PASS: Case 6")

def test_case_7():
    print("\n--- Test Case 7: Maharashtra district inflections (Pune, Nagpur, Nashik) ---")
    for district_text, expected_dist in [
        ("मी पुणे जिल्हा येथे राहतो", "Pune"),
        ("मैं नागपूर जिले से हूँ", "Nagpur"),
        ("I live in Nashik district", "Nashik")
    ]:
        payload = {"text": district_text}
        r = requests.post(f"{BASE_URL}/api/nlp/extract", json=payload).json()
        dist = r["extracted_fields"]["district"]
        assert dist == expected_dist, f"Expected {expected_dist}, got {dist} for '{district_text}'"
        assert r["extracted_fields"]["state"] == "Maharashtra", f"Expected Maharashtra for {expected_dist}"
    print("PASS: Case 7")

def test_case_8():
    print("\n--- Test Case 8: Generic pronouns without name keywords do not extract names ---")
    payload = {
        "text": "मैं महाराष्ट्र में रहता हूँ और खेती करता हूँ।",
        "language": "hi"
    }
    r = requests.post(f"{BASE_URL}/api/nlp/extract", json=payload).json()
    fields = r["extracted_fields"]
    print("Extracted fields:", fields)
    assert fields.get("full_name") is None, f"Expected None name, got {fields.get('full_name')}"
    assert fields["state"] == "Maharashtra"
    assert fields["occupation"] == "Farmer"
    print("PASS: Case 8")

def test_case_9():
    print("\n--- Test Case 9: English intent classification & NER on prompt example ---")
    payload = {
        "text": "My name is Rahul Sharma. I was born on 15 August 2002. I am male, I live in Maharashtra in Thane district, I am a student, my annual income is around two lakh rupees, and I belong to the OBC category.",
        "language": "en"
    }
    r = requests.post(f"{BASE_URL}/api/nlp/extract", json=payload).json()
    fields = r["extracted_fields"]
    print("Extracted fields:", fields)
    assert fields["full_name"] == "Rahul Sharma"
    assert fields["date_of_birth"] == "2002-08-15"
    assert fields["gender"] == "Male"
    assert fields["state"] == "Maharashtra"
    assert fields["district"] == "Thane"
    assert fields["occupation"] == "Student"
    assert fields["annual_income"] == 200000
    assert fields["category"] == "OBC"
    assert r["is_complete"] is True
    print("PASS: Case 9")

def test_case_10():
    print("\n--- Test Case 10: Multi-turn missing info prompt & response merge ---")
    turn1_payload = {
        "text": "My name is Amit. I live in Pune and I am a farmer.",
        "language": "en"
    }
    r1 = requests.post(f"{BASE_URL}/api/nlp/extract", json=turn1_payload).json()
    print("Turn 1 missing fields:", r1["missing_fields"])
    assert r1["is_complete"] is False
    assert "date_of_birth" in r1["missing_fields"]
    assert "annual_income" in r1["missing_fields"]

    turn2_payload = {
        "text": "I was born on 10/05/1995 and my income is 150000 rupees. I belong to General category and male.",
        "language": "en",
        "previous_profile": r1["extracted_fields"]
    }
    r2 = requests.post(f"{BASE_URL}/api/nlp/extract", json=turn2_payload).json()
    f2 = r2["extracted_fields"]
    print("Turn 2 merged fields:", f2)
    assert f2["full_name"] == "Amit", "Must preserve name from turn 1"
    assert f2["district"] == "Pune", "Must preserve district from turn 1"
    assert f2["occupation"] == "Farmer", "Must preserve occupation from turn 1"
    assert f2["date_of_birth"] == "1995-05-10"
    assert f2["annual_income"] == 150000
    assert f2["category"] == "General"
    assert f2["gender"] == "Male"
    assert r2["is_complete"] is True
    print("PASS: Case 10")

def test_case_11():
    print("\n--- Test Case 11: Document verification comparison rules (PyMuPDF / WinRT OCR) ---")
    import fitz
    # Create synthetic PDF 1: Full match
    doc1 = fitz.open()
    page1 = doc1.new_page()
    page1.insert_text((50, 100), "Unique Identification Authority of India\nGovernment of India\nName: Rahul Sharma\nDOB: 15/08/2002\nGender: Male\n1234 5678 9012")
    pdf_bytes1 = doc1.write()

    # Upload to backend / AI service
    files = {"pdf": ("aadhaar_match.pdf", pdf_bytes1, "application/pdf")}
    data = {
        "document_type": "Aadhaar Card",
        "profile_name": "Rahul Sharma",
        "profile_dob": "2002-08-15",
        "profile_gender": "Male"
    }
    res1 = requests.post(f"{BASE_URL}/api/ocr/extract-pdf", files=files, data=data).json()
    print("Doc 1 Result:", res1["verification"]["status"], res1["verification"]["details"])
    assert res1["verification"]["status"] == "verified", f"Expected verified, got {res1['verification']['status']}"
    assert res1["verification"]["name_match"] is True
    assert res1["verification"]["dob_match"] is True

    # Synthetic PDF 2: Name Mismatch
    files2 = {"pdf": ("aadhaar_mismatch.pdf", pdf_bytes1, "application/pdf")}
    data2 = {
        "document_type": "Aadhaar Card",
        "profile_name": "Sunil Verma",
        "profile_dob": "2002-08-15",
        "profile_gender": "Male"
    }
    res2 = requests.post(f"{BASE_URL}/api/ocr/extract-pdf", files=files2, data=data2).json()
    print("Doc 2 Result:", res2["verification"]["status"], res2["verification"]["details"])
    assert res2["verification"]["status"] == "needs_review", f"Expected needs_review on name mismatch, got {res2['verification']['status']}"
    assert res2["verification"]["name_match"] is False

    # Synthetic PDF 3: Birth Year Only (Cannot claim full DOB verified)
    doc3 = fitz.open()
    page3 = doc3.new_page()
    page3.insert_text((50, 100), "Unique Identification Authority of India\nName: Rahul Sharma\nYear of Birth: 2002\nGender: Male\n1234 5678 9012")
    pdf_bytes3 = doc3.write()
    files3 = {"pdf": ("aadhaar_year_only.pdf", pdf_bytes3, "application/pdf")}
    data3 = {
        "document_type": "Aadhaar Card",
        "profile_name": "Rahul Sharma",
        "profile_dob": "2002-08-15",
        "profile_gender": "Male"
    }
    res3 = requests.post(f"{BASE_URL}/api/ocr/extract-pdf", files=files3, data=data3).json()
    print("Doc 3 Result:", res3["verification"]["status"], res3["verification"]["details"])
    assert res3["verification"]["status"] == "needs_review", "Birth year only must not mark full DOB verified"
    assert res3["verification"]["year_only"] is True
    assert res3["verification"]["dob_match"] is False
    print("PASS: Case 11")

def test_case_12():
    print("\n--- Test Case 12: Backend express proxy and document persistence ---")
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), "Unique Identification Authority of India\nName: Priya Patil\nDOB: 20/04/1998\nGender: Female\n9876 5432 1098")
    pdf_bytes = doc.write()

    files = {"file": ("priya_aadhaar.pdf", pdf_bytes, "application/pdf")}
    data = {
        "user_id": "test_user_reg_12",
        "document_type": "Aadhaar Card",
        "profile_name": "Priya Patil",
        "profile_dob": "1998-04-20",
        "profile_gender": "Female"
    }
    res = requests.post("http://127.0.0.1:3001/api/documents", files=files, data=data)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}"
    doc_json = res.json()
    print("Uploaded document record:", doc_json["id"], doc_json["verification"]["status"])
    assert doc_json["verification"]["status"] == "verified"
    assert doc_json["verification"]["field_comparisons"]["name"]["status"] == "match"
    assert doc_json["verification"]["field_comparisons"]["date_of_birth"]["status"] == "match"
    print("PASS: Case 12")

if __name__ == "__main__":
    test_case_1()
    test_case_2()
    test_case_3()
    test_case_4()
    test_case_5()
    test_case_6()
    test_case_7()
    test_case_8()
    test_case_9()
    test_case_10()
    test_case_11()
    test_case_12()
    print("\n==========================================")
    print("ALL 12 REGRESSION TESTS PASSED 100%!")
    print("==========================================")
