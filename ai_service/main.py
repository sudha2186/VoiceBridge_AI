"""
VoiceBridge AI — Unified Python AI Microservice
Provides:
1. Speech-to-Text (ASR) using fine-tuned local OpenAI Whisper Small
2. Multilingual Named Entity Recognition (NER) & Profile Extraction using:
   - Fine-tuned XLM-RoBERTa for Hindi NER
   - Fine-tuned Marathi BERT for Marathi NER
   - English NLP & slot-filling normalizers for English & code-mixed text
3. Targeted missing-information clarification prompt generation
4. Text-to-Speech (TTS) integration point with dependency status reporting
"""

import os
import sys
import tempfile
import io
import re
import traceback
import subprocess
import shutil
from typing import Optional, Dict, Any, List

import torch
import numpy as np
import soundfile as sf
import joblib
import warnings
warnings.filterwarnings("ignore", category=UserWarning)

try:
    import fitz  # PyMuPDF for fast, real PDF text and document extraction
except ImportError:
    fitz = None

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    WhisperProcessor,
    WhisperForConditionalGeneration
)

# Relative import of normalizers
from normalizers import (
    normalize_gender,
    normalize_category,
    normalize_occupation,
    normalize_income,
    extract_date_of_birth,
    derive_dob_from_age,
    extract_state_and_district,
    CANONICAL_STATES,
    CANONICAL_DISTRICTS,
    DISTRICT_TO_STATE,
    HINDI_NUMBERS,
    MARATHI_NUMBERS
)

app = FastAPI(
    title="VoiceBridge AI — Model Inference Microservice",
    version="2.1.0",
    description="ASR, Multilingual NER, English Intent, and Entity Extraction Microservice"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================================================
# Model Directories and Global Instances
# ====================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

HINDI_NER_DIR = os.path.join(MODELS_DIR, "hindi_ner")
MARATHI_NER_DIR = os.path.join(MODELS_DIR, "marathi_ner")
WHISPER_DIR = os.path.join(MODELS_DIR, "whisper_small")

# English NER and Intent directories
ENGLISH_NER_DIR = os.path.join(BASE_DIR, "english", "english_ner")
ENGLISH_INTENT_DIR = os.path.join(BASE_DIR, "english", "english_intent")

if ENGLISH_NER_DIR not in sys.path:
    sys.path.insert(0, ENGLISH_NER_DIR)
if ENGLISH_INTENT_DIR not in sys.path:
    sys.path.insert(0, ENGLISH_INTENT_DIR)

try:
    from preprocessing import tokenize as english_tokenize, decode_entities as english_decode_entities
    from features import sent2features as english_sent2features
except Exception as e:
    english_tokenize = None
    english_decode_entities = None
    english_sent2features = None
    print(f"[AI Service] English NER preprocessing import warning: {e}")

# Global model holders
whisper_processor = None
whisper_model = None

hindi_tokenizer = None
hindi_model = None

marathi_tokenizer = None
marathi_model = None

english_crf_model = None
english_intent_pipeline = None

MANDATORY_PROFILE_FIELDS = [
    "full_name",
    "date_of_birth",
    "gender",
    "state",
    "district",
    "occupation",
    "annual_income",
    "category"
]

FIELD_LABELS_MULTILINGUAL = {
    "en": {
        "full_name": "full name",
        "date_of_birth": "date of birth",
        "gender": "gender",
        "state": "state",
        "district": "district",
        "occupation": "occupation",
        "annual_income": "annual income",
        "category": "caste/category"
    },
    "hi": {
        "full_name": "पूरा नाम",
        "date_of_birth": "जन्म तिथि",
        "gender": "लिंग",
        "state": "राज्य",
        "district": "जिला",
        "occupation": "व्यवसाय",
        "annual_income": "वार्षिक आय",
        "category": "जाति/वर्ग"
    },
    "mr": {
        "full_name": "पूर्ण नाव",
        "date_of_birth": "जन्मतारीख",
        "gender": "लिंग",
        "state": "राज्य",
        "district": "जिल्हा",
        "occupation": "व्यवसाय",
        "annual_income": "वार्षिक उत्पन्न",
        "category": "जात/प्रवर्ग"
    }
}

# ====================================================
# Model Loaders
# ====================================================

def load_models():
    global whisper_processor, whisper_model
    global hindi_tokenizer, hindi_model
    global marathi_tokenizer, marathi_model
    global english_crf_model, english_intent_pipeline

    print("[AI Service] Loading models into CPU memory...")

    # 1. English NER (CRF Model) - lightweight (~100KB)
    english_ner_path = os.path.join(ENGLISH_NER_DIR, "ner_crf.joblib")
    if os.path.exists(english_ner_path):
        try:
            print("[AI Service] Loading English NER (CRF model)...")
            english_crf_model = joblib.load(english_ner_path)
            print(f"[AI Service] English NER loaded successfully. Labels count: {len(getattr(english_crf_model, 'classes_', []))}")
        except Exception as e:
            print(f"[AI Service] Error loading English NER model: {e}")

    # 2. English Intent Classification Pipeline - lightweight (~140KB)
    english_intent_path = os.path.join(ENGLISH_INTENT_DIR, "intent_pipeline.joblib")
    if os.path.exists(english_intent_path):
        try:
            print("[AI Service] Loading English Intent Classification Pipeline...")
            english_intent_pipeline = joblib.load(english_intent_path)
            classes_count = len(getattr(english_intent_pipeline, 'classes_', []))
            print(f"[AI Service] English Intent Pipeline loaded successfully. Classes count: {classes_count}")
        except Exception as e:
            print(f"[AI Service] Error loading English Intent Pipeline: {e}")

    # 3. Marathi NER (BERT) - ~712MB
    if os.path.exists(MARATHI_NER_DIR):
        try:
            print("[AI Service] Loading Marathi NER (marathi-bert-v2)...", flush=True)
            marathi_tokenizer = AutoTokenizer.from_pretrained(MARATHI_NER_DIR)
            marathi_model = AutoModelForTokenClassification.from_pretrained(MARATHI_NER_DIR)
            marathi_model.eval()
            print("[AI Service] Marathi NER loaded successfully.", flush=True)
        except BaseException as e:
            print(f"[AI Service] Marathi NER load notice (memory/paging limit): {e}", flush=True)

    # 4. Hindi NER (XLM-RoBERTa) - ~1.11GB
    if os.path.exists(HINDI_NER_DIR):
        try:
            print("[AI Service] Loading Hindi NER (XLM-RoBERTa)...", flush=True)
            hindi_tokenizer = AutoTokenizer.from_pretrained(HINDI_NER_DIR)
            hindi_model = AutoModelForTokenClassification.from_pretrained(HINDI_NER_DIR)
            hindi_model.eval()
            print("[AI Service] Hindi NER loaded successfully.", flush=True)
        except BaseException as e:
            print(f"[AI Service] Hindi NER load notice (memory/paging limit): {e}", flush=True)

    # 5. Whisper Small ASR - ~966MB
    if os.path.exists(WHISPER_DIR):
        try:
            print("[AI Service] Loading Whisper Small ASR...", flush=True)
            whisper_processor = WhisperProcessor.from_pretrained(WHISPER_DIR)
            whisper_model = WhisperForConditionalGeneration.from_pretrained(WHISPER_DIR)
            whisper_model.eval()
            print("[AI Service] Whisper Small ASR loaded successfully.", flush=True)
        except BaseException as e:
            print(f"[AI Service] Whisper Small load notice (memory/paging limit): {e}", flush=True)

    print("[AI Service] All available local models initialized.", flush=True)

@app.on_event("startup")
def startup_event():
    load_models()

# ====================================================
# Language Detection Helper
# ====================================================

def detect_language(text: str) -> str:
    """Detects whether text is Hindi (hi), Marathi (mr), or English (en)."""
    devanagari_chars = len(re.findall(r"[\u0900-\u097F]", text))
    if devanagari_chars > 0:
        marathi_markers = ["आहे", "माझे", "नाव", "वय", "राहतो", "राहते", "शेतकरी", "उत्पन्न", "रुपये", "जिल्हा", "वर्षे", "मी", "प्रवर्गातील"]
        hindi_markers = ["है", "मेरा", "मेरी", "नाम", "उम्र", "रहता", "रहती", "हूँ", "हुं", "रुपये", "साल", "वर्ष", "मैं", "वर्ग"]

        mr_count = sum(1 for m in marathi_markers if m in text)
        hi_count = sum(1 for h in hindi_markers if h in text)

        if mr_count > hi_count:
            return "mr"
        return "hi"
    return "en"

# ====================================================
# Token Cleanup Helpers
# ====================================================

def clean_token_str(tokens: List[str], lang: str) -> str:
    """Cleans subword tokens for sentencepiece (Hindi) and WordPiece (Marathi)."""
    if lang == "hi":
        raw = "".join(tokens).replace("▁", " ").replace(" ", " ")
        raw = re.sub(r"</?[a-zA-Z0-9_-]+>", "", raw)
        return raw.strip()
    elif lang == "mr":
        res = []
        for t in tokens:
            if t.startswith("##"):
                res.append(t[2:])
            else:
                if res:
                    res.append(" ")
                res.append(t)
        raw = "".join(res)
        raw = re.sub(r"\[[A-Z]+\]", "", raw)
        return raw.strip()
    return " ".join(tokens).strip()

def run_hindi_ner(text: str) -> Dict[str, str]:
    if hindi_model is None or hindi_tokenizer is None:
        return {}
    inputs = hindi_tokenizer(text, return_tensors="pt")
    with torch.no_grad():
        outputs = hindi_model(**inputs)
    predictions = torch.argmax(outputs.logits, dim=2)[0]
    tokens = hindi_tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])

    extracted: Dict[str, List[str]] = {}
    current_entity = None
    current_tokens: List[str] = []

    for token, pred_id in zip(tokens, predictions):
        label = hindi_model.config.id2label[pred_id.item()]
        if label.startswith("B-"):
            if current_entity and current_tokens:
                extracted.setdefault(current_entity, []).append(clean_token_str(current_tokens, "hi"))
            current_entity = label[2:]
            current_tokens = [token]
        elif label.startswith("I-") and current_entity == label[2:]:
            current_tokens.append(token)
        else:
            if current_entity and current_tokens:
                extracted.setdefault(current_entity, []).append(clean_token_str(current_tokens, "hi"))
            current_entity = None
            current_tokens = []

    if current_entity and current_tokens:
        extracted.setdefault(current_entity, []).append(clean_token_str(current_tokens, "hi"))

    return {k: " ".join(v).strip() for k, v in extracted.items()}

def run_marathi_ner(text: str) -> Dict[str, str]:
    if marathi_model is None or marathi_tokenizer is None:
        return {}
    inputs = marathi_tokenizer(text, return_tensors="pt")
    with torch.no_grad():
        outputs = marathi_model(**inputs)
    predictions = torch.argmax(outputs.logits, dim=2)[0]
    tokens = marathi_tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])

    extracted: Dict[str, List[str]] = {}
    current_entity = None
    current_tokens: List[str] = []

    for token, pred_id in zip(tokens, predictions):
        label = marathi_model.config.id2label[pred_id.item()]
        if label.startswith("B-"):
            if current_entity and current_tokens:
                extracted.setdefault(current_entity, []).append(clean_token_str(current_tokens, "mr"))
            current_entity = label[2:]
            current_tokens = [token]
        elif label.startswith("I-") and current_entity == label[2:]:
            current_tokens.append(token)
        else:
            if current_entity and current_tokens:
                extracted.setdefault(current_entity, []).append(clean_token_str(current_tokens, "mr"))
            current_entity = None
            current_tokens = []

    if current_entity and current_tokens:
        extracted.setdefault(current_entity, []).append(clean_token_str(current_tokens, "mr"))

    return {k: " ".join(v).strip() for k, v in extracted.items()}

def run_english_ner(text: str) -> List[Dict[str, str]]:
    """
    Runs English CRF NER model inference on input text.
    Returns: list of dicts: [{"text": str, "label": str}]
    """
    if english_crf_model is None or english_tokenize is None or english_sent2features is None:
        return []
    try:
        tokens = english_tokenize(text)
        if not tokens:
            return []
        feats = english_sent2features(tokens)
        tags = english_crf_model.predict([feats])[0]
        entities = english_decode_entities(tokens, tags)
        return entities
    except Exception as e:
        print(f"[AI Service] English NER inference error: {e}")
        return []

def predict_english_intent(text: str) -> Dict[str, Any]:
    """
    Predicts intent using the English Intent Pipeline (TF-IDF + Logistic Regression).
    Returns: {"intent": str, "confidence": float}
    """
    if english_intent_pipeline is None or not text.strip():
        return {"intent": "unknown", "confidence": 0.0}
    try:
        probs = english_intent_pipeline.predict_proba([text])[0]
        best_idx = probs.argmax()
        intent_label = str(english_intent_pipeline.classes_[best_idx])
        conf = round(float(probs[best_idx]), 4)
        return {"intent": intent_label, "confidence": conf}
    except Exception as e:
        print(f"[AI Service] English intent prediction error: {e}")
        return {"intent": "unknown", "confidence": 0.0}

# ====================================================
# Comprehensive Entity Extraction & Intent Endpoints
# ====================================================

class IntentRequest(BaseModel):
    text: str
    language: Optional[str] = "en"

class IntentResponse(BaseModel):
    success: bool
    intent: str
    confidence: float
    text: str
    language: str

class NLPRequest(BaseModel):
    text: str
    language: Optional[str] = None
    previous_profile: Optional[Dict[str, Any]] = None

class NLPResponse(BaseModel):
    success: bool
    language: str
    extracted_fields: Dict[str, Any]
    confidence_scores: Dict[str, float]
    missing_fields: List[str]
    clarification_prompt: str
    is_complete: bool
    intent: Optional[Dict[str, Any]] = None
    model_entities: Optional[List[Dict[str, Any]]] = None
    field_sources: Optional[Dict[str, str]] = None

@app.post("/api/nlp/intent", response_model=IntentResponse)
@app.post("/intent", response_model=IntentResponse)
def intent_endpoint(req: IntentRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    lang = req.language or "en"
    if lang == "en" and english_intent_pipeline is not None:
        res = predict_english_intent(text)
        return IntentResponse(
            success=True,
            intent=res["intent"],
            confidence=res["confidence"],
            text=text,
            language="en"
        )
    return IntentResponse(
        success=True,
        intent="unknown",
        confidence=0.0,
        text=text,
        language=lang
    )

@app.post("/api/nlp/extract", response_model=NLPResponse)
@app.post("/extract", response_model=NLPResponse)
def extract_entities_endpoint(req: NLPRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    lang = req.language or detect_language(text)
    if lang not in ["en", "hi", "mr"]:
        lang = "en"

    field_sources: Dict[str, str] = {}
    model_entities: List[Dict[str, Any]] = []
    intent_data: Optional[Dict[str, Any]] = None

    # 1. Run model-based NER and Intent if available
    ner_entities: Dict[str, str] = {}
    if lang == "en":
        if english_intent_pipeline is not None:
            intent_data = predict_english_intent(text)
        if english_crf_model is not None:
            model_entities = run_english_ner(text)
            for ent in model_entities:
                lbl = ent.get("label", "")
                txt = ent.get("text", "")
                if lbl and txt:
                    if lbl in ner_entities:
                        ner_entities[lbl] += " " + txt
                    else:
                        ner_entities[lbl] = txt
    elif lang == "hi" and hindi_model is not None:
        ner_entities = run_hindi_ner(text)
        model_entities = [{"text": v, "label": k} for k, v in ner_entities.items()]
    elif lang == "mr" and marathi_model is not None:
        ner_entities = run_marathi_ner(text)
        model_entities = [{"text": v, "label": k} for k, v in ner_entities.items()]

    # 2. Extract Full Name
    full_name = None
    if "NAME" in ner_entities:
        raw_name = ner_entities["NAME"].strip()
        raw_name = re.sub(r"^(मेरा नाम|माझे नाव|my name is)\s*", "", raw_name, flags=re.IGNORECASE)
        raw_name = re.sub(r"[▁\s]+", " ", raw_name).strip()
        if len(raw_name) >= 2:
            full_name = raw_name
            field_sources["full_name"] = "model_crf" if lang == "en" else ("model_hindi_ner" if lang == "hi" else "model_marathi_ner")

    if not full_name:
        # Check explicit "my name is X" / "मेरा नाम X" / "माझे नाव X"
        explicit_match = re.search(r"(?:my name is|मेरा नाम|माझे नाव)\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)", text, re.IGNORECASE)
        if explicit_match:
            full_name = explicit_match.group(1).strip()
            field_sources["full_name"] = "rule_pattern"
        else:
            # Check explicit "I am [Name]" only if followed by valid name and not occupation/gender/location
            cand = None
            if lang == "en":
                i_am_match = re.search(r"(?:i am|i'm)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)", text, re.IGNORECASE)
                if i_am_match:
                    cand = i_am_match.group(1).strip()
            elif lang == "hi":
                i_am_hi = re.search(r"मैं\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)\s+हूँ", text)
                if i_am_hi:
                    cand = i_am_hi.group(1).strip()
            elif lang == "mr":
                i_am_mr = re.search(r"मी\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)\s+आहे", text)
                if i_am_mr:
                    cand = i_am_mr.group(1).strip()

            if cand:
                forbidden_name_tokens = {
                    "student", "farmer", "male", "female", "living", "from", "working", "district", "state", "city",
                    "महाराष्ट्र", "ठाणे", "पुणे", "मुंबई", "भारत", "रहता", "रहती", "रहते", "राहतो", "राहते", "राहतात",
                    "जिल्हा", "जिल्ह्यात", "जिले", "जिला", "राज्य", "शहर", "मध्ये", "तील", "त", "के", "छात्र", "शेतकरी",
                    "विद्यार्थी", "पुरुष", "महिला", "वय", "साल", "वर्ष", "हूँ", "आहे"
                }
                cand_tokens = set(cand.lower().split()) | set(re.findall(r"\w+", cand.lower()))
                if not (cand_tokens & forbidden_name_tokens) and not cand.lower().startswith("a "):
                    full_name = cand
                    field_sources["full_name"] = "rule_pattern"

    # 3. Extract Date of Birth (DOB)
    dob, dob_type = extract_date_of_birth(text)
    if dob:
        field_sources["date_of_birth"] = "rule_date_parser"
    else:
        raw_age_str = ner_entities.get("AGE")
        if raw_age_str:
            num_match = re.search(r"\b\d{1,3}\b", raw_age_str)
            if num_match:
                dob = derive_dob_from_age(int(num_match.group(0)))
                field_sources["date_of_birth"] = "model_crf" if lang == "en" else "model_ner_age"
    if not dob:
        age_match = re.search(r"\b(\d{1,2})\s*(?:years?|साल|वर्ष|वय)", text, re.IGNORECASE)
        if age_match:
            dob = derive_dob_from_age(int(age_match.group(1)))
            field_sources["date_of_birth"] = "rule_pattern"

    # 4. Extract Gender
    gender = None
    if "GENDER" in ner_entities:
        gender = normalize_gender(ner_entities["GENDER"])
        if gender:
            field_sources["gender"] = "model_crf"
    if not gender:
        gender = normalize_gender(text)
        if gender:
            field_sources["gender"] = "rule_pattern"

    # 5. Extract State & District safely with validation and word boundaries
    state, district, geo_sources = extract_state_and_district(text, ner_entities, lang)
    field_sources.update(geo_sources)

    # 6. Extract Occupation
    occupation = None
    if "OCCUPATION" in ner_entities:
        occupation = normalize_occupation(ner_entities["OCCUPATION"])
        if occupation:
            field_sources["occupation"] = "model_crf" if lang == "en" else "model_ner_occ"
    if not occupation:
        occupation = normalize_occupation(text)
        if occupation:
            field_sources["occupation"] = "rule_pattern"

    # 7. Extract Annual Income (Strict Context & DOB Separation)
    annual_income = None
    if "INCOME" in ner_entities:
        annual_income, inc_status = normalize_income(ner_entities["INCOME"], context_text=text)
        if annual_income is not None:
            field_sources["annual_income"] = "rule_converted_from_monthly" if inc_status == "converted_from_monthly" else "model_crf"

    if annual_income is None:
        annual_income, inc_status = normalize_income(text, context_text=text)
        if annual_income is not None:
            field_sources["annual_income"] = "rule_converted_from_monthly" if inc_status == "converted_from_monthly" else "rule_income_context"

    # 8. Extract Caste / Category
    category = None
    if "CATEGORY" in ner_entities:
        category = normalize_category(ner_entities["CATEGORY"])
        if category:
            field_sources["category"] = "model_crf"
    if not category:
        category = normalize_category(text)
        if category:
            field_sources["category"] = "rule_pattern"

    # Assemble raw extractions
    current_extractions = {
        "full_name": full_name,
        "date_of_birth": dob,
        "gender": gender,
        "state": state,
        "district": district,
        "occupation": occupation,
        "annual_income": annual_income,
        "category": category
    }

    # Merge with previous_profile:
    # Rule: If previous_profile has a confirmed non-null value, do NOT overwrite it
    # unless the new extraction provides a non-null value that is valid and not a false positive.
    final_fields: Dict[str, Any] = {}
    prev = req.previous_profile or {}

    for field in MANDATORY_PROFILE_FIELDS:
        val = current_extractions.get(field)
        prev_val = prev.get(field)
        if prev_val is not None and str(prev_val).strip() != "":
            # Keep previous confirmed value unless new value is provided and different
            if val is not None and str(val).strip() != "":
                final_fields[field] = val
            else:
                final_fields[field] = prev_val
        else:
            final_fields[field] = val

    # Calculate missing fields
    missing_fields = [
        f for f in MANDATORY_PROFILE_FIELDS
        if final_fields.get(f) is None or str(final_fields.get(f)).strip() == ""
    ]

    is_complete = len(missing_fields) == 0

    # Conversational routing if input is general non-profile query with no newly extracted profile fields
    labels = FIELD_LABELS_MULTILINGUAL.get(lang, FIELD_LABELS_MULTILINGUAL["en"])
    missing_labels = [labels.get(f, f) for f in missing_fields]

    if intent_data and len(field_sources) == 0 and len(missing_fields) == len(MANDATORY_PROFILE_FIELDS):
        in_label = intent_data.get("intent", "unknown")
        if in_label == "greeting":
            prompt = "Hello! Welcome to VoiceBridge AI. I can assist you with government welfare schemes and completing your profile. Please tell me about yourself or ask a question."
        elif in_label == "document_requirements":
            prompt = "Common documents required for government schemes include Aadhaar Card, Income Certificate, Caste Certificate (if applicable), and Domicile Certificate. Please mention your profile details so I can match you with eligible schemes."
        elif in_label == "benefit_information":
            prompt = "Government schemes offer direct benefit transfers, subsidized loans, education support, and insurance. Tell me about your age, occupation, and state to check your eligible benefits."
        elif in_label in ["help", "application_guidance"]:
            prompt = "VoiceBridge AI helps citizens discover schemes and apply via voice or text in English, Hindi, and Marathi. You can start by mentioning your profile details."
        elif in_label == "application_status":
            prompt = "You can view the real-time status of your submitted applications on the Applications dashboard. To apply for more schemes, please complete your profile."
        else:
            prompt = f"You have not mentioned your {', '.join(missing_labels[:3])}. Please tell me your details in your own words."
    elif is_complete:
        if lang == "hi":
            prompt = "आपके सभी 8 विवरण प्राप्त हो चुके हैं। कृपया समीक्षा करें और पुष्टि करें।"
        elif lang == "mr":
            prompt = "तुमचे सर्व 8 तपशील प्राप्त झाले आहेत. कृपया पुनरावलोकन करा आणि पुष्टी करा."
        else:
            prompt = "All 8 profile details have been collected. Please review and confirm your details."
    else:
        if lang == "hi":
            joined = " और ".join(missing_labels) if len(missing_labels) <= 2 else ", ".join(missing_labels[:-1]) + f" और {missing_labels[-1]}"
            prompt = f"आपने अपना {joined} नहीं बताया है। कृपया यह विवरण बताएं।"
        elif lang == "mr":
            joined = " आणि ".join(missing_labels) if len(missing_labels) <= 2 else ", ".join(missing_labels[:-1]) + f" आणि {missing_labels[-1]}"
            prompt = f"तुम्ही तुमचा {joined} सांगितले नाही. कृपया हे तपशील सांगा."
        else:
            joined = " and ".join(missing_labels) if len(missing_labels) <= 2 else ", ".join(missing_labels[:-1]) + f", and {missing_labels[-1]}"
            prompt = f"You have not mentioned your {joined}. Please tell me these details in your own words."

    confidence_scores = {}
    for k in MANDATORY_PROFILE_FIELDS:
        if final_fields.get(k) is not None:
            src = field_sources.get(k, "persisted")
            if "model" in src:
                confidence_scores[k] = 0.95
            elif "rule" in src:
                confidence_scores[k] = 0.90
            else:
                confidence_scores[k] = 0.90
        else:
            confidence_scores[k] = 0.0

    return NLPResponse(
        success=True,
        language=lang,
        extracted_fields=final_fields,
        confidence_scores=confidence_scores,
        missing_fields=missing_fields,
        clarification_prompt=prompt,
        is_complete=is_complete,
        intent=intent_data,
        model_entities=model_entities,
        field_sources=field_sources
    )

# ====================================================
# Speech-to-Text (ASR) via Whisper Small
# ====================================================

LANGUAGE_CODE_MAP = {
    "english": "en",
    "en": "en",
    "en-in": "en",
    "eng": "en",
    "hindi": "hi",
    "hi": "hi",
    "hi-in": "hi",
    "hin": "hi",
    "marathi": "mr",
    "mr": "mr",
    "mr-in": "mr",
    "mar": "mr",
    "hinglish": "hi",
    "minglish": "mr"
}

def decode_audio_bytes(audio_bytes: bytes) -> tuple:
    """
    Decodes audio bytes (WAV, WebM, OGG, MP3, etc.) into a 1D NumPy float32 array
    at 16000Hz sampling rate.
    Includes silence/energy check and peak amplitude normalization.
    """
    data = None
    sample_rate = 16000

    ffmpeg_exe = shutil.which("ffmpeg") or r"C:\Users\sudha\AppData\Local\Microsoft\WinGet\Links\ffmpeg.EXE"

    # 1. Try ffmpeg pipe conversion first (standard from browser MediaRecorder WebM/Opus)
    if ffmpeg_exe and os.path.exists(ffmpeg_exe):
        try:
            cmd = [
                ffmpeg_exe,
                "-y",
                "-i", "pipe:0",
                "-vn",
                "-ar", "16000",
                "-ac", "1",
                "-f", "wav",
                "pipe:1"
            ]
            proc = subprocess.run(
                cmd,
                input=audio_bytes,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=True
            )
            with io.BytesIO(proc.stdout) as wav_file:
                data, sample_rate = sf.read(wav_file)
        except Exception:
            data = None

    # 2. Try direct soundfile read (fast for native WAV/FLAC)
    if data is None:
        try:
            with io.BytesIO(audio_bytes) as audio_file:
                data, sample_rate = sf.read(audio_file)
                if sample_rate != 16000:
                    import scipy.signal
                    number_of_samples = round(len(data) * float(16000) / sample_rate)
                    data = scipy.signal.resample(data, number_of_samples)
                    sample_rate = 16000
        except Exception:
            data = None

    # 3. Temp file fallback with ffmpeg
    if data is None and ffmpeg_exe and os.path.exists(ffmpeg_exe):
        tmp_in = None
        tmp_out = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f_in:
                f_in.write(audio_bytes)
                tmp_in = f_in.name
            tmp_out = tmp_in + ".wav"
            cmd = [
                ffmpeg_exe,
                "-y",
                "-i", tmp_in,
                "-ar", "16000",
                "-ac", "1",
                tmp_out
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            data, sample_rate = sf.read(tmp_out)
        except Exception as e:
            print(f"[AI Service ASR] ffmpeg temp file decode notice: {e}", flush=True)
        finally:
            if tmp_in and os.path.exists(tmp_in):
                try: os.remove(tmp_in)
                except Exception: pass
            if tmp_out and os.path.exists(tmp_out):
                try: os.remove(tmp_out)
                except Exception: pass

    # 4. Librosa fallback
    if data is None:
        try:
            import librosa
            with io.BytesIO(audio_bytes) as b:
                data, sample_rate = librosa.load(b, sr=16000, mono=True)
        except Exception:
            data = None

    if data is None:
        raise ValueError("Could not decode audio stream in any supported format (WAV/WebM/OGG).")

    if len(data.shape) > 1:
        data = data.mean(axis=1)

    data = data.astype("float32")

    # RMS energy calculation for silence detection
    rms = float(np.sqrt(np.mean(data**2))) if len(data) > 0 else 0.0

    # Peak normalization: scale audio to 0.90 to give Whisper clean acoustic signal
    max_amp = float(np.max(np.abs(data))) if len(data) > 0 else 0.0
    if max_amp > 0.005:
        data = (data / max_amp) * 0.90

    return data, 16000, rms

@app.post("/api/asr/transcribe")
@app.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form("en")
):
    global whisper_model, whisper_processor
    if whisper_model is None or whisper_processor is None:
        if os.path.exists(WHISPER_DIR):
            try:
                print("[AI Service] Loading Whisper Small on demand...", flush=True)
                whisper_processor = WhisperProcessor.from_pretrained(WHISPER_DIR)
                whisper_model = WhisperForConditionalGeneration.from_pretrained(WHISPER_DIR)
                whisper_model.eval()
            except Exception as e:
                print(f"[AI Service] On-demand Whisper load failed: {e}", flush=True)

    if whisper_model is None or whisper_processor is None:
        raise HTTPException(
            status_code=503,
            detail="Whisper Small model is not loaded."
        )

    lang_key = language.strip().lower()
    target_lang = LANGUAGE_CODE_MAP.get(lang_key, "en")

    try:
        audio_bytes = await audio.read()
        if not audio_bytes or len(audio_bytes) < 100:
            return {
                "success": False,
                "error": "Uploaded audio file is empty or corrupted."
            }

        data, sample_rate, rms = decode_audio_bytes(audio_bytes)

        # Silence check: avoid hallucinations on silence / empty recording
        if rms < 0.002 or len(data) < 4000:
            return {
                "success": True,
                "text": "",
                "language": target_lang,
                "notice": "No speech detected in audio."
            }

        inputs = whisper_processor(
            data,
            sampling_rate=16000,
            return_tensors="pt"
        )
        input_features = inputs.input_features

        forced_decoder_ids = whisper_processor.get_decoder_prompt_ids(
            language=target_lang,
            task="transcribe"
        )

        with torch.no_grad():
            predicted_ids = whisper_model.generate(
                input_features,
                forced_decoder_ids=forced_decoder_ids,
                max_new_tokens=225,
                repetition_penalty=1.05,
                temperature=0.0
            )

        transcription = whisper_processor.batch_decode(
            predicted_ids,
            skip_special_tokens=True
        )[0].strip()

        # Clean trailing repetition artifacts
        transcription = re.sub(r"(\b\w+\b)( \1){3,}", r"\1", transcription)

        return {
            "success": True,
            "text": transcription,
            "language": target_lang
        }

    except Exception as e:
        traceback.print_exc()
        return {
            "success": False,
            "error": f"ASR transcription failed: {str(e)}"
        }

# ====================================================
# Real PDF Document Extraction & Verification via PyMuPDF
# ====================================================

# ====================================================
# Real Document Extraction & Profile Verification
# ====================================================

def run_winrt_ocr_on_image(image_path: str) -> str:
    """Runs Windows Media OCR via PowerShell on an image file."""
    ps1_script = os.path.join(BASE_DIR, "ocr_engine.ps1")
    if not os.path.exists(ps1_script):
        return ""
    try:
        res = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1_script, "-ImagePath", image_path],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=15
        )
        if res.returncode == 0:
            return res.stdout.strip()
    except Exception as e:
        print(f"[AI Service OCR] WinRT OCR execution error: {e}", flush=True)
    return ""

DEVANAGARI_DIGITS = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
}

def devanagari_to_ascii_digits(text: str) -> str:
    """Converts Devanagari numerals (०-९) to ASCII digits (0-9)."""
    if not text:
        return ""
    return "".join(DEVANAGARI_DIGITS.get(ch, ch) for ch in text)

def clean_extracted_name(name_str: str) -> Optional[str]:
    """Cleans raw name candidate extracted from document while preserving Devanagari Unicode."""
    if not name_str:
        return None
    cand = re.sub(
        r"^(?:Name|नाव|नाम|Shri|Smt|Mr|Ms|Mrs|Dr|श्री|श्रीमती|कुमार|कुमारी|रा\.)\s*[:\-\u2013.]?\s*",
        "",
        name_str.strip(),
        flags=re.IGNORECASE
    )
    cand = re.sub(
        r"(?:DOB|Date of Birth|Gender|Male|Female|S/O|D/O|W/O|C/O|Address|Aadhaar|आत्मज|पुत्र|मुलगा|मुलगी).*",
        "",
        cand,
        flags=re.IGNORECASE
    )
    cand = re.sub(r"[^\w\s\u0900-\u097F]", " ", cand).strip()
    cand = re.sub(r"\s+", " ", cand).strip()
    if len(cand) >= 3 and not re.search(
        r"(?:Government|India|सरकार|भारत|UIDAI|Authority|Commission|महाराष्ट्र|तहसील|कार्यालय)",
        cand,
        re.IGNORECASE
    ):
        if re.search(r"[A-Za-z]", cand):
            return cand.title()
        return cand
    return None

def parse_income_certificate(raw_text: str) -> dict:
    """
    Extracts structured fields from English, Hindi, and Marathi Income Certificates.
    Handles Aaple Sarkar / Tahsildar / e-District formats with Devanagari numerals.
    """
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
    """
    Extracts structured fields from English, Hindi, and Marathi Caste Certificates.
    """
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

def standardize_document_date(raw_date: str) -> Optional[str]:
    """Standardizes document date format to YYYY-MM-DD."""
    if not raw_date:
        return None
    clean = re.sub(r"[^\d/\-.]", "", raw_date.strip()).replace("/", "-").replace(".", "-")
    parts = clean.split("-")
    if len(parts) == 3:
        if len(parts[0]) == 4:  # YYYY-MM-DD
            return f"{int(parts[0]):04d}-{int(parts[1]):02d}-{int(parts[2]):02d}"
        elif len(parts[2]) == 4:  # DD-MM-YYYY
            return f"{int(parts[2]):04d}-{int(parts[1]):02d}-{int(parts[0]):02d}"
    return None

@app.post("/api/ocr/extract-pdf")
@app.post("/ocr/extract-pdf")
async def extract_and_verify_pdf(
    pdf: UploadFile = File(...),
    document_type: str = Form("Aadhaar Card"),
    profile_name: Optional[str] = Form(None),
    profile_dob: Optional[str] = Form(None),
    profile_gender: Optional[str] = Form(None)
):
    """
    Extracts text and key document entities from uploaded PDF or Image.
    Implements Aadhaar-specific extraction paths, layout awareness, and strict profile verification.
    """
    if fitz is None:
        return {
            "success": False,
            "error": "PyMuPDF (fitz) library is not installed in the Python environment."
        }

    try:
        file_bytes = await pdf.read()
        if not file_bytes or len(file_bytes) < 30:
            return {
                "success": False,
                "error": "Uploaded document file is empty or corrupted."
            }

        filename = pdf.filename or "document.pdf"
        file_ext = os.path.splitext(filename)[1].lower()
        is_image_file = file_ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp"]

        raw_text = ""
        page_count = 1

        if is_image_file:
            # Direct Image OCR via temporary file
            with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as tmp_img:
                tmp_img.write(file_bytes)
                tmp_img_path = tmp_img.name
            try:
                raw_text = run_winrt_ocr_on_image(tmp_img_path)
            finally:
                if os.path.exists(tmp_img_path):
                    try: os.remove(tmp_img_path)
                    except Exception: pass
        else:
            # PDF Document handling via PyMuPDF
            try:
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                page_count = len(doc)
                page_texts = [page.get_text() for page in doc]
                raw_text = "\n".join(page_texts).strip()

                # If selectable text is empty or minimal (scanned PDF), use OCR on rendered pages
                if len(raw_text) < 20:
                    ocr_lines = []
                    for page_idx in range(min(page_count, 3)):
                        page = doc[page_idx]
                        pix = page.get_pixmap(dpi=150)
                        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_pix:
                            pix.pil_save(tmp_pix.name, format="PNG")
                            tmp_pix_path = tmp_pix.name
                        try:
                            page_ocr = run_winrt_ocr_on_image(tmp_pix_path)
                            if page_ocr:
                                ocr_lines.append(page_ocr)
                        finally:
                            if os.path.exists(tmp_pix_path):
                                try: os.remove(tmp_pix_path)
                                except Exception: pass
                    if ocr_lines:
                        raw_text = "\n".join(ocr_lines).strip()
            except Exception as pdf_err:
                # If fitz fails to open as PDF, attempt image fallback
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_f:
                    tmp_f.write(file_bytes)
                    tmp_f_path = tmp_f.name
                try:
                    raw_text = run_winrt_ocr_on_image(tmp_f_path)
                finally:
                    if os.path.exists(tmp_f_path):
                        try: os.remove(tmp_f_path)
                        except Exception: pass

        extracted = {
            "name": None,
            "dob": None,
            "birth_year": None,
            "dob_type": None,
            "gender": None,
            "document_number": None,
            "income": None,
            "address": None,
            "page_count": page_count,
            "raw_text_snippet": raw_text[:400] if raw_text else ""
        }

        doc_type_lower = document_type.lower()
        is_aadhaar = "aadhaar" in doc_type_lower or "आधार" in raw_text or "aadhaar" in raw_text.lower() or "uidai" in raw_text.lower()
        is_income = "income" in doc_type_lower or "उत्पन्न" in raw_text or "उत्पन्नाचा दाखला" in raw_text or "आय प्रमाण" in raw_text or "income certificate" in raw_text.lower()
        is_caste = "caste" in doc_type_lower or "जात" in raw_text or "जातीचे" in raw_text or "जाति" in raw_text or "caste certificate" in raw_text.lower()

        # ==========================================
        # 1. Specialized Extraction by Document Type
        # ==========================================
        if is_income:
            # 1A. Specialized Income Certificate Extractor (English, Hindi, Marathi)
            inc_info = parse_income_certificate(raw_text)
            extracted["name"] = inc_info["applicant_name"]
            extracted["income"] = inc_info["income_amount"]
            extracted["financial_year"] = inc_info["financial_year"]
            extracted["issuing_authority"] = inc_info["issuing_authority"]
            extracted["document_number"] = inc_info["certificate_number"]
            extracted["issue_date"] = inc_info["issue_date"]
            extracted["income_owner"] = inc_info["income_owner"]
            extracted["document_type"] = "Income Certificate"

            # Fallback to general date if issue_date not matched
            if not extracted["dob"]:
                extracted["dob"] = inc_info["issue_date"]
                extracted["dob_type"] = "full" if inc_info["issue_date"] else None

        elif is_caste:
            # 1B. Specialized Caste Certificate Extractor (English, Hindi, Marathi)
            caste_info = parse_caste_certificate(raw_text)
            extracted["name"] = caste_info["applicant_name"]
            extracted["category"] = caste_info["category"]
            extracted["caste"] = caste_info["caste"]
            extracted["document_number"] = caste_info["certificate_number"]
            extracted["issuing_authority"] = caste_info["issuing_authority"]
            extracted["issue_date"] = caste_info["issue_date"]
            extracted["document_type"] = "Caste Certificate"

            if not extracted["dob"]:
                extracted["dob"] = caste_info["issue_date"]
                extracted["dob_type"] = "full" if caste_info["issue_date"] else None

        elif is_aadhaar:
            # 1C. Aadhaar Number (12 digits, often formatted as 'XXXX XXXX 1234' or '1234 5678 9012')
            a_match = re.search(r"\b([X\d]{4}\s[X\d]{4}\s\d{4})\b|\b(\d{12})\b", raw_text)
            if a_match:
                extracted["document_number"] = a_match.group(0).strip()

            # Name Extraction (Explicit label or line before DOB)
            name_match = re.search(r"(?:Name|नाव|नाम)\s*[:\-\u2013]?\s*([A-Za-z\u0900-\u097F\s]{3,40})", raw_text, re.IGNORECASE)
            if name_match:
                cand = clean_extracted_name(name_match.group(1))
                if cand:
                    extracted["name"] = cand
            else:
                lines = [ln.strip() for ln in raw_text.splitlines() if ln.strip()]
                for idx, ln in enumerate(lines):
                    if re.search(r"(?:DOB|Date\s+of\s+Birth|Year\s+of\s+Birth|जन्म)", ln, re.IGNORECASE) and idx > 0:
                        cand = clean_extracted_name(lines[idx - 1])
                        if cand:
                            extracted["name"] = cand
                            break

            # Date of Birth or Year of Birth
            full_dob_m = re.search(
                r"(?:DOB|Date\s+of\s+Birth|जन्मतारीख|जन्म\s*तिथि)\s*[:\-\u2013]?\s*(\d{2}[/\-. ]\d{2}[/\-. ]\d{4}|\d{4}[/\-. ]\d{2}[/\-. ]\d{2})",
                raw_text,
                re.IGNORECASE
            )
            year_only_m = re.search(
                r"(?:Year\s+of\s+Birth|Birth\s+Year|जन्म\s*वर्ष|जन्म\s*साल)\s*[:\-\u2013]?\s*(19\d\d|20[0-2]\d)\b",
                raw_text,
                re.IGNORECASE
            )

            if full_dob_m:
                std_dob = standardize_document_date(full_dob_m.group(1))
                if std_dob:
                    extracted["dob"] = std_dob
                    extracted["dob_type"] = "full"
            elif year_only_m:
                extracted["birth_year"] = year_only_m.group(1)
                extracted["dob"] = f"{year_only_m.group(1)}-01-01"
                extracted["dob_type"] = "year_only"
            else:
                any_date = re.search(r"\b(\d{2}[/\-.](?:0[1-9]|1[0-2])[/\-.](?:19\d\d|20[0-2]\d))\b", raw_text)
                if any_date:
                    std_dob = standardize_document_date(any_date.group(1))
                    if std_dob:
                        extracted["dob"] = std_dob
                        extracted["dob_type"] = "full"

            # Gender
            g_match = re.search(r"\b(Male|Female|Transgender|पुरुष|महिला|स्त्री)\b", raw_text, re.IGNORECASE)
            if g_match:
                extracted["gender"] = normalize_gender(g_match.group(1))

        else:
            # Generic Document Extraction
            name_match = re.search(r"(?:Name|नाव|नाम)\s*[:\-\u2013]?\s*([A-Za-z\u0900-\u097F\s]{3,40})", raw_text, re.IGNORECASE)
            if name_match:
                cand = clean_extracted_name(name_match.group(1))
                if cand:
                    extracted["name"] = cand

            dob_match = re.search(r"(?:DOB|Date of Birth|जन्मतारीख|जन्म तिथि)\s*[:\-\u2013]?\s*(\d{2}[/\-.]\d{2}[/\-.]\d{4})", raw_text, re.IGNORECASE)
            if dob_match:
                extracted["dob"] = standardize_document_date(dob_match.group(1))
                extracted["dob_type"] = "full"

            if "pan" in doc_type_lower:
                p_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", raw_text)
                if p_match:
                    extracted["document_number"] = p_match.group(1).strip()
            else:
                num_match = re.search(r"(?:Certificate No|Cert No|Reg No|Acc No|Account No|क्रमांक|No\.)\s*[:\-\u2013]?\s*([A-Za-z0-9\-_/]{6,25})", raw_text, re.IGNORECASE)
                if num_match:
                    extracted["document_number"] = num_match.group(1).strip()

            inc_match = re.search(r"(?:Rs\.?|₹|INR|आय|वार्षिक उत्पन्न|Annual Income)\s*[:\-\u2013]?\s*([\d,]+)", raw_text, re.IGNORECASE)
            if inc_match:
                extracted["income"] = inc_match.group(1).replace(",", "").strip()

        # Address / State extraction
        for st_name in CANONICAL_STATES.values():
            if st_name.lower() in raw_text.lower():
                extracted["address"] = st_name
                break

        # ==========================================
        # 2. Strict Profile Comparison Logic
        # ==========================================
        field_comparisons = {}
        details = []

        # 2A. Name Comparison
        if not extracted["name"]:
            name_comp = {
                "status": "unreadable",
                "document_value": None,
                "profile_value": profile_name,
                "detail": "Applicant name could not be reliably extracted from document."
            }
        elif not profile_name:
            name_comp = {
                "status": "match",
                "document_value": extracted["name"],
                "profile_value": None,
                "detail": f"Document extracted name '{extracted['name']}' (no profile name to compare)."
            }
        else:
            p_clean = re.sub(r"[^\w\s\u0900-\u097F]", "", profile_name.lower()).strip()
            e_clean = re.sub(r"[^\w\s\u0900-\u097F]", "", extracted["name"].lower()).strip()
            tokens_p = set(p_clean.split())
            tokens_e = set(e_clean.split())

            # Check exact match or subset matching
            if p_clean == e_clean or (tokens_p and tokens_p.issubset(tokens_e)) or (tokens_e and tokens_e.issubset(tokens_p)):
                name_comp = {
                    "status": "match",
                    "document_value": extracted["name"],
                    "profile_value": profile_name,
                    "detail": f"Name verified: '{extracted['name']}' matches profile name '{profile_name}'."
                }
            else:
                overlap = len(tokens_p & tokens_e) / max(len(tokens_p), len(tokens_e), 1)
                if overlap >= 0.65:
                    name_comp = {
                        "status": "match",
                        "document_value": extracted["name"],
                        "profile_value": profile_name,
                        "detail": f"Name verified: '{extracted['name']}' matches profile name '{profile_name}'."
                    }
                else:
                    name_comp = {
                        "status": "mismatch",
                        "document_value": extracted["name"],
                        "profile_value": profile_name,
                        "detail": f"Name discrepancy: Document states '{extracted['name']}' vs saved profile '{profile_name}'."
                    }
        field_comparisons["name"] = name_comp
        details.append(name_comp["detail"])

        # 2B. DOB Comparison
        if not extracted["dob"]:
            dob_comp = {
                "status": "unreadable" if is_aadhaar else "not_applicable",
                "document_value": None,
                "profile_value": profile_dob,
                "detail": "Date of birth could not be read from document." if is_aadhaar else "Date of birth not evaluated for this certificate type."
            }
        elif not profile_dob:
            dob_comp = {
                "status": "match",
                "document_value": extracted["dob"],
                "profile_value": None,
                "detail": f"Document date extracted as {extracted['dob']}."
            }
        else:
            clean_p = profile_dob.replace("/", "-")
            clean_e = extracted["dob"].replace("/", "-")

            if extracted.get("dob_type") == "year_only":
                p_year = clean_p.split("-")[0] if len(clean_p.split("-")[0]) == 4 else clean_p.split("-")[-1]
                e_year = extracted.get("birth_year") or clean_e.split("-")[0]
                if p_year == e_year:
                    dob_comp = {
                        "status": "insufficient_document_information",
                        "document_value": f"Year: {e_year}",
                        "profile_value": profile_dob,
                        "detail": f"Birth year {e_year} matches profile birth year, but complete date of birth is not verified by this document."
                    }
                else:
                    dob_comp = {
                        "status": "mismatch",
                        "document_value": f"Year: {e_year}",
                        "profile_value": profile_dob,
                        "detail": f"Birth year mismatch: Document states birth year {e_year} vs profile DOB '{profile_dob}'."
                    }
            elif is_aadhaar:
                if clean_p == clean_e:
                    dob_comp = {
                        "status": "match",
                        "document_value": extracted["dob"],
                        "profile_value": profile_dob,
                        "detail": f"Date of birth verified: {extracted['dob']}."
                    }
                else:
                    dob_comp = {
                        "status": "mismatch",
                        "document_value": extracted["dob"],
                        "profile_value": profile_dob,
                        "detail": f"DOB discrepancy: Document states '{extracted['dob']}' vs saved profile '{profile_dob}'."
                    }
            else:
                # For certificates, dob slot holds certificate issue date
                dob_comp = {
                    "status": "match",
                    "document_value": extracted["dob"],
                    "profile_value": profile_dob,
                    "detail": f"Certificate issue date extracted: {extracted['dob']}."
                }
        field_comparisons["date_of_birth"] = dob_comp
        if is_aadhaar:
            details.append(dob_comp["detail"])

        # 2C. Income Comparison (for Income Certificate)
        if is_income:
            if extracted.get("income") is not None:
                field_comparisons["income"] = {
                    "status": "match",
                    "document_value": f"₹{int(extracted['income']):,}",
                    "profile_value": None,
                    "detail": f"Annual income certified as ₹{int(extracted['income']):,} ({extracted.get('financial_year') or 'Current Year'})."
                }
                details.append(field_comparisons["income"]["detail"])
            else:
                field_comparisons["income"] = {
                    "status": "unreadable",
                    "document_value": None,
                    "profile_value": None,
                    "detail": "Income amount could not be read from certificate."
                }
                details.append(field_comparisons["income"]["detail"])

        # 2D. Category Comparison (for Caste Certificate)
        if is_caste:
            if extracted.get("category"):
                field_comparisons["category"] = {
                    "status": "match",
                    "document_value": extracted["category"],
                    "profile_value": None,
                    "detail": f"Caste/Category certified as {extracted['category']}{' (' + extracted['caste'] + ')' if extracted.get('caste') else ''}."
                }
                details.append(field_comparisons["category"]["detail"])
            else:
                field_comparisons["category"] = {
                    "status": "unreadable",
                    "document_value": None,
                    "profile_value": None,
                    "detail": "Category could not be read from caste certificate."
                }
                details.append(field_comparisons["category"]["detail"])

        # 2E. Gender Comparison (if present in Aadhaar)
        if extracted.get("gender") and profile_gender:
            if extracted["gender"].lower() == profile_gender.lower():
                gender_comp = {
                    "status": "match",
                    "document_value": extracted["gender"],
                    "profile_value": profile_gender,
                    "detail": f"Gender matches: {extracted['gender']}."
                }
            else:
                gender_comp = {
                    "status": "mismatch",
                    "document_value": extracted["gender"],
                    "profile_value": profile_gender,
                    "detail": f"Gender discrepancy: Document states '{extracted['gender']}' vs profile '{profile_gender}'."
                }
            field_comparisons["gender"] = gender_comp
            details.append(gender_comp["detail"])

        # ==========================================
        # 3. Overall Document Verification Status Rules
        # ==========================================
        name_status = field_comparisons["name"]["status"]
        dob_status = field_comparisons["date_of_birth"]["status"]

        if is_aadhaar:
            if name_status == "match" and dob_status == "match":
                status = "verified"
            elif dob_status == "insufficient_document_information":
                status = "needs_review"  # Only birth year present; cannot declare full DOB verified
            elif name_status == "mismatch" or dob_status == "mismatch":
                status = "needs_review"
            elif name_status == "unreadable" or dob_status == "unreadable":
                status = "needs_review"
            elif raw_text:
                status = "needs_review"
            else:
                status = "failed"
        elif is_income:
            if name_status == "match" and extracted.get("income") is not None and extracted.get("document_number"):
                status = "verified"
            elif name_status == "mismatch":
                status = "needs_review"
            elif extracted.get("income") is not None:
                status = "extracted"
            elif raw_text:
                status = "needs_review"
            else:
                status = "failed"
        elif is_caste:
            if name_status == "match" and extracted.get("category") and extracted.get("document_number"):
                status = "verified"
            elif name_status == "mismatch":
                status = "needs_review"
            elif extracted.get("category"):
                status = "extracted"
            elif raw_text:
                status = "needs_review"
            else:
                status = "failed"
        else:
            # Generic document
            if name_status == "match" and (dob_status == "match" or extracted.get("document_number")):
                status = "verified"
            elif name_status == "mismatch":
                status = "needs_review"
            elif raw_text:
                status = "extracted"
            else:
                status = "failed"

        return {
            "success": status != "failed",
            "extracted_data": extracted,
            "verification": {
                "status": status,
                "name_match": name_status == "match",
                "dob_match": dob_status == "match",
                "year_only": extracted.get("dob_type") == "year_only",
                "field_comparisons": field_comparisons,
                "details": details,
                "disclaimer": "Text consistency verification against profile details completed. Official legal authenticity requires issuing authority or DigiLocker verification."
            }
        }

    except Exception as e:
        traceback.print_exc()
        return {
            "success": False,
            "error": f"Document processing error: {str(e)}"
        }

# ====================================================
# Indic Parler-TTS Integration Point
# ====================================================

@app.post("/api/tts/synthesize")
@app.post("/synthesize")
def synthesize_tts(text: str = Form(...), language: str = Form("en")):
    """
    TTS Synthesis endpoint.
    Reports honest status regarding Indic Parler-TTS model weights & dependencies.
    """
    return {
        "success": False,
        "status": "blocked",
        "reason": "Indic Parler-TTS (ai4bharat/indic-parler-tts) requires transformers==4.46.1. Host environment has transformers 5.14.1, which causes dependency conflict with parler-tts. Browser Web Speech API fallback is active for spoken responses.",
        "fallback": "web_speech",
        "text": text,
        "language": language
    }

# ====================================================
# Health Check Endpoint
# ====================================================

@app.get("/api/health")
@app.get("/health")
@app.get("/")
def health():
    return {
        "service": "VoiceBridge AI — Python Microservice",
        "status": "online",
        "models": {
            "whisper_small": whisper_model is not None,
            "hindi_ner": hindi_model is not None,
            "marathi_ner": marathi_model is not None,
            "english_ner": english_crf_model is not None,
            "english_intent": english_intent_pipeline is not None,
            "pdf_ocr": fitz is not None,
            "indic_parler_tts": "blocked (transformers 5.14 compatibility)"
        },
        "python_version": sys.version.split(" ")[0],
        "device": "cpu"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
