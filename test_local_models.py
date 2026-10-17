import sys
import os
import torch

sys.stdout.reconfigure(encoding='utf-8')

print("Testing Model Loading and Inference...")

models_dir = os.path.abspath("ai_service/models") if os.path.exists("ai_service/models") else os.path.abspath("VoiceBridge_AI-main/ai_service/models")
hindi_dir = os.path.join(models_dir, "hindi_ner")
marathi_dir = os.path.join(models_dir, "marathi_ner")
whisper_dir = os.path.join(models_dir, "whisper_small")

# 1. Hindi NER
print("\n--- 1. Testing Hindi NER ---")
from transformers import AutoTokenizer, AutoModelForTokenClassification

hindi_tokenizer = AutoTokenizer.from_pretrained(hindi_dir)
hindi_model = AutoModelForTokenClassification.from_pretrained(hindi_dir)
hindi_model.eval()
print(f"Hindi NER loaded. Labels count: {len(hindi_model.config.id2label)}")

sample_hi = "मेरा नाम राहुल शर्मा है और मेरी उम्र 22 वर्ष है। मैं महाराष्ट्र के ठाणे जिले में रहता हूँ।"
inputs = hindi_tokenizer(sample_hi, return_tensors="pt")
with torch.no_grad():
    outputs = hindi_model(**inputs)
preds = torch.argmax(outputs.logits, dim=2)[0]
tokens = hindi_tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
entities_hi = []
for tok, p in zip(tokens, preds):
    label = hindi_model.config.id2label[p.item()]
    if label != "O":
        entities_hi.append((tok, label))
print("Hindi extracted tokens/labels sample:", entities_hi[:8])

# 2. Marathi NER
print("\n--- 2. Testing Marathi NER ---")
marathi_tokenizer = AutoTokenizer.from_pretrained(marathi_dir)
marathi_model = AutoModelForTokenClassification.from_pretrained(marathi_dir)
marathi_model.eval()
print(f"Marathi NER loaded. Labels count: {len(marathi_model.config.id2label)}")

sample_mr = "माझे नाव राहुल आहे आणि माझे वय 22 वर्षे आहे. मी ठाणे महाराष्ट्रात राहतो."
inputs = marathi_tokenizer(sample_mr, return_tensors="pt")
with torch.no_grad():
    outputs = marathi_model(**inputs)
preds = torch.argmax(outputs.logits, dim=2)[0]
tokens = marathi_tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
entities_mr = []
for tok, p in zip(tokens, preds):
    label = marathi_model.config.id2label[p.item()]
    if label != "O":
        entities_mr.append((tok, label))
print("Marathi extracted tokens/labels sample:", entities_mr[:8])

# 3. Whisper Small
print("\n--- 3. Testing Whisper Small ---")
from transformers import WhisperProcessor, WhisperForConditionalGeneration
whisper_processor = WhisperProcessor.from_pretrained(whisper_dir)
whisper_model = WhisperForConditionalGeneration.from_pretrained(whisper_dir)
whisper_model.eval()
print("Whisper Small processor & model loaded successfully!")

print("\nALL 3 CORE LOCAL MODELS LOADED & VERIFIED ON CPU!")
