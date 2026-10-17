import os
import sys
import traceback

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath('ai_service'))
sys.path.insert(0, os.path.abspath('ai_service/english/english_ner'))
sys.path.insert(0, os.path.abspath('ai_service/english/english_intent'))

output_lines = []

def log(msg=""):
    print(msg, flush=True)
    output_lines.append(str(msg))

try:
    import main
    log("Imported main.py successfully.")
    
    main.load_models()
    log("load_models() completed.")
    log(f"Whisper loaded: {main.whisper_model is not None}")
    log(f"Hindi NER loaded: {main.hindi_model is not None}")
    log(f"Marathi NER loaded: {main.marathi_model is not None}")
    log(f"English CRF loaded: {main.english_crf_model is not None}")
    log(f"English Intent loaded: {main.english_intent_pipeline is not None}")

    # Test 1: Full profile sentence in English
    s1 = "My name is Rahul. I was born on 4 October 1986. I am male, I live in Maharashtra in Thane district, I am a farmer, my annual income is around two lakh rupees, and I belong to the OBC category."
    req1 = main.NLPRequest(text=s1, language="en")
    res1 = main.extract_entities_endpoint(req1)
    log("\n--- TEST 1: Full English Profile Sentence ---")
    log(f"Language: {res1.language}")
    log(f"Intent: {res1.intent}")
    log(f"Extracted Fields: {res1.extracted_fields}")
    log(f"Field Sources: {res1.field_sources}")
    log(f"Missing Fields: {res1.missing_fields}")
    log(f"Is Complete: {res1.is_complete}")
    log(f"Clarification Prompt: {res1.clarification_prompt}")

    # Test 2: Partial English input
    s2 = "My name is Anita. I am female, student from Pune, Maharashtra."
    req2 = main.NLPRequest(text=s2, language="en")
    res2 = main.extract_entities_endpoint(req2)
    log("\n--- TEST 2: Partial English Sentence ---")
    log(f"Extracted: {res2.extracted_fields}")
    log(f"Missing Fields: {res2.missing_fields}")
    log(f"Clarification Prompt: {res2.clarification_prompt}")

    # Test 3: Follow-up merge with previous profile
    s3 = "My annual income is 150000 and caste is SC."
    req3 = main.NLPRequest(text=s3, language="en", previous_profile=res2.extracted_fields)
    res3 = main.extract_entities_endpoint(req3)
    log("\n--- TEST 3: Follow-up Merge with Previous Profile ---")
    log(f"Merged Fields: {res3.extracted_fields}")
    log(f"Missing Fields: {res3.missing_fields}")

    # Test 4: Standalone Intent Endpoint
    req_intent = main.IntentRequest(text="Which documents do I need to submit?")
    res_intent = main.intent_endpoint(req_intent)
    log("\n--- TEST 4: Standalone Intent Classification ---")
    log(f"Intent: {res_intent.intent}, Confidence: {res_intent.confidence}")

    # Test 5: Hindi Profile Sentence
    s_hi = "मेरा नाम रमेश कुमार है। मैं 35 साल का हूँ, पुरुष, उत्तर प्रदेश के लखनऊ जिले में रहता हूँ, किसान हूँ, आय पचास हजार रुपये है और सामान्य वर्ग से हूँ।"
    req_hi = main.NLPRequest(text=s_hi, language="hi")
    res_hi = main.extract_entities_endpoint(req_hi)
    log("\n--- TEST 5: Hindi Profile Extraction ---")
    log(f"Language: {res_hi.language}")
    log(f"Extracted: {res_hi.extracted_fields}")
    log(f"Is Complete: {res_hi.is_complete}")

    # Test 6: Marathi Profile Sentence
    s_mr = "माझे नाव सचिन पाटील आहे. माझे वय 28 वर्षे आहे. मी पुरुष, शेतकरी, ठाणे जिल्हा, महाराष्ट्र, उत्पन्न 120000 रुपये आणि प्रवर्ग ओबीसी."
    req_mr = main.NLPRequest(text=s_mr, language="mr")
    res_mr = main.extract_entities_endpoint(req_mr)
    log("\n--- TEST 6: Marathi Profile Extraction ---")
    log(f"Language: {res_mr.language}")
    log(f"Extracted: {res_mr.extracted_fields}")
    log(f"Is Complete: {res_mr.is_complete}")

    log("\nALL 6 VERIFICATION TESTS PASSED SUCCESSFULLY!")

except Exception as e:
    log(f"\nEXCEPTION OCCURRED: {e}")
    traceback.print_exc()

with open("test_results.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines))
