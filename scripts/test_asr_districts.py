# -*- coding: utf-8 -*-
import sys
import json
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

test_phrases = [
    ("English 1", "My district is Thane and state is Maharashtra", "en"),
    ("English 2", "I live in Pune district", "en"),
    ("Hindi 1", "मेरा जिला ठाणे है और राज्य महाराष्ट्र", "hi"),
    ("Hindi 2 (ASR variant)", "मेरा जिला थाने है", "hi"),
    ("Marathi 1", "माझा जिल्हा ठाणे आहे", "mr"),
    ("Marathi 2 (ASR variant)", "माझा जिल्हा थाने आहे", "mr"),
    ("Marathi 3 (Keyword after)", "मी पुणे जिल्ह्यात राहतो", "mr"),
    ("Marathi 4 (Kolhapur variant)", "माझा जिल्हा कोल्हापूर आहे", "mr"),
]

print("--- Testing Speech-to-Text & District Extraction Against Running AI Service ---")
all_passed = True

for label, text, lang in test_phrases:
    payload = json.dumps({"text": text, "language": lang}).encode("utf-8")
    req = urllib.request.Request(
        "http://localhost:8000/api/nlp/extract",
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            dist = data.get("extracted_fields", {}).get("district")
            state = data.get("extracted_fields", {}).get("state")
            src = data.get("field_sources", {})
            print(f"[{label}] '{text}' ({lang}) -> District: {dist}, State: {state} | Sources: {src}")
            if not dist:
                print(f"  FAILED: Expected district extraction for: '{text}'")
                all_passed = False
    except Exception as e:
        print(f"[{label}] Error: {e}")
        all_passed = False

if all_passed:
    print("\nALL 8 DISTRICT TEST CASES PASSED SUCCESSFULLY!")
else:
    print("\nSOME DISTRICT TEST CASES FAILED.")
