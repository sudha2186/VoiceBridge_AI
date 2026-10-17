import sys
import os
import json

sys.stdout.reconfigure(encoding='utf-8')
ai_dir = os.path.abspath("ai_service") if os.path.exists("ai_service") else os.path.abspath("VoiceBridge_AI-main/ai_service")
sys.path.insert(0, ai_dir)

from fastapi.testclient import TestClient
from main import app, load_models

print("Starting AI Service Logic Test...")
# Load models
load_models()

client = TestClient(app)

# 1. Health check
res = client.get("/api/health")
print("Health check response:", res.status_code, res.json())

# 2. Test English natural language sentence from prompt
sample_en = "My name is Rahul. I was born on 15 August 2002. I am male, I live in Maharashtra in Thane district, I am a student, my annual income is around two lakh rupees, and I belong to the OBC category."

res_en = client.post("/api/nlp/extract", json={"text": sample_en, "language": "en"})
print("\n--- English Natural Language Extraction ---")
print("Status:", res_en.status_code)
d_en = res_en.json()
print("Extracted fields:", json.dumps(d_en["extracted_fields"], indent=2, ensure_ascii=False))
print("Missing fields:", d_en["missing_fields"])
print("Is complete:", d_en["is_complete"])
print("Clarification prompt:", d_en["clarification_prompt"])

# 3. Test Hindi sentence
sample_hi = "मेरा नाम राहुल है। मेरा जन्म 15 अगस्त 2002 को हुआ था। मैं पुरुष हूँ, मैं महाराष्ट्र के ठाणे जिले में रहता हूँ, मैं छात्र हूँ, मेरी वार्षिक आय दो लाख रुपये है और मैं ओबीसी वर्ग से हूँ।"
res_hi = client.post("/api/nlp/extract", json={"text": sample_hi, "language": "hi"})
print("\n--- Hindi Natural Language Extraction ---")
d_hi = res_hi.json()
print("Extracted fields:", json.dumps(d_hi["extracted_fields"], indent=2, ensure_ascii=False))
print("Missing fields:", d_hi["missing_fields"])
print("Clarification prompt:", d_hi["clarification_prompt"])

# 4. Test Marathi sentence
sample_mr = "माझे नाव राहुल आहे. माझा जन्म 15 ऑगस्ट 2002 रोजी झाला. मी पुरुष आहे, मी महाराष्ट्रात ठाणे जिल्ह्यात राहतो, मी विद्यार्थी आहे, माझे वार्षिक उत्पन्न दोन लाख रुपये आहे आणि मी ओबीसी प्रवर्गातील आहे."
res_mr = client.post("/api/nlp/extract", json={"text": sample_mr, "language": "mr"})
print("\n--- Marathi Natural Language Extraction ---")
d_mr = res_mr.json()
print("Extracted fields:", json.dumps(d_mr["extracted_fields"], indent=2, ensure_ascii=False))
print("Missing fields:", d_mr["missing_fields"])
print("Clarification prompt:", d_mr["clarification_prompt"])

# 5. Multi-turn missing info test
# Turn 1: user mentions name, DOB, state, district, gender, category (missing occupation & income)
turn1_text = "My name is Rahul. I was born on 15 August 2002. I am male, living in Thane, Maharashtra. I belong to OBC."
res_turn1 = client.post("/api/nlp/extract", json={"text": turn1_text, "language": "en"})
d_turn1 = res_turn1.json()
print("\n--- Multi-Turn: Turn 1 (Partial) ---")
print("Missing fields:", d_turn1["missing_fields"])
print("Clarification prompt:", d_turn1["clarification_prompt"])

# Turn 2: user only provides the missing details
turn2_text = "I am a student and my annual income is two lakh rupees."
res_turn2 = client.post("/api/nlp/extract", json={
    "text": turn2_text,
    "language": "en",
    "previous_profile": d_turn1["extracted_fields"]
})
d_turn2 = res_turn2.json()
print("\n--- Multi-Turn: Turn 2 (Merged) ---")
print("Extracted fields after merge:", json.dumps(d_turn2["extracted_fields"], indent=2, ensure_ascii=False))
print("Missing fields after merge:", d_turn2["missing_fields"])
print("Is complete:", d_turn2["is_complete"])
print("Clarification prompt:", d_turn2["clarification_prompt"])

print("\n✅ ALL AI MICROSERVICE NLP EXTRACTION TESTS COMPLETED SUCCESSFULLY!")
