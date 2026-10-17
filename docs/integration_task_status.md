# VoiceBridge AI - Integration Task Status

This document tracks the tasks required to transition the VoiceBridge AI project from isolated Colab notebooks and Node.js skeletons into a fully functional, integrated application.

---

## 🟢 Work Already Implemented and Verified
*These components exist in the repository and are functional on their own.*

- [x] **Node.js Express Foundation:** Controllers, middleware, routes, and error handling are scaffolded (`backend/`).
- [x] **ASR Proxy Route:** `asrRoutes.js` successfully accepts multi-part form data and forwards it to an external API URL.
- [x] **Supabase Authentication Middleware:** `authMiddleware.js` contains valid logic for JWT verification.
- [x] **Database Models:** Mongoose/ORM-style models (`userModel.js`, `schemeModel.js`) define the required data structures.

---

## 🟡 Work Present in Code but Not Yet Tested (Integration Context)
*These components are written in Jupyter Notebooks but have not been tested in a live HTTP microservice context.*

- [ ] **Whisper ASR Web Server:** `VoiceBridgeAi_WHISPER_model (1).ipynb` contains a Flask server implementation (`run_server`, `run_server_8002`). This needs to be spun up as an independent Python process.
- [ ] **Hindi Profile Normalization:** `translate_hindi_to_english` and `clean_itrans_name` functions correctly canonicalize data, but must be ported to a standard `.py` module.
- [ ] **English Feature Extraction:** `word2features` and `sent2features` exist but must be hooked up to a loaded CRF model.

---

## 🔴 Work Blocked by Missing Model Artifacts
*These tasks cannot proceed until the trained model weights and configurations are downloaded from Google Drive / Colab and placed in the project directory.*

- [ ] **Load Hindi NER Model:** Requires checkpoints from `/content/drive/MyDrive/VoiceBridge_AI/Hindi_NER_Model`.
- [ ] **Load Marathi NER Model:** Requires checkpoints from `/content/voicebridge_marathi_ner`.
- [ ] **Load Marathi Intent Model:** Requires checkpoints from `/content/voicebridge_marathi_intent` (or `_v2`).
- [ ] **Load English NLP Pickles:** Requires the `.pkl` files corresponding to the CRF/NLTK pipeline.
- [ ] **Configure Whisper Base Weights:** Ensure the environment has internet access to download `openai/whisper` or provide cached weights.

---

## 🔵 Work That Needs Implementation (Next Steps)
*These are new developments required to connect the system.*

1.  **Extract Notebook Functions to Python Modules (Priority: High):**
    - Convert notebook cells containing `extract_profile`, `predict_intent`, and preprocessing logic into clean `.py` files.
2.  **Create Unified NLP Service (Priority: High):**
    - Implement a Flask/FastAPI service (`nlp_service.py`) with a `POST /process` endpoint that accepts the unified JSON Request schema and returns the unified JSON Response schema.
3.  **Implement Chat Controller in Node.js (Priority: High):**
    - Update `chatController.js` to call the new Unified NLP Service and handle the standardized entity/intent payload.
4.  **Connect Scheme Evaluation (Priority: Medium):**
    - Write the database query logic in `chatController.js` to compare the extracted entities (Age, Income, State, etc.) against `schemeModel.js` rules.
5.  **Provision Supabase Database (Priority: Low - Pending Integration):**
    - Create the live Supabase project, execute schema creation SQL, and update `.env` credentials.

---

## ❓ Work Requiring Decision or Clarification
- **Clarify Final Model Paths:** Which of the duplicate model folders (`voicebridge_marathi_intent` vs `_v2`, `Hindi_NER_Model` vs `_Realistic`) should be promoted to production?
- **English Model Dependencies:** How exactly is the English model serialized (is it a `joblib`/`pickle` CRF file)?
- **Entity Granularity:** If a user specifies "Pune" but the model expects "Maharashtra", do we need an external location-mapping service, or does the model normalize district -> state implicitly?
