# VoiceBridge AI - Complete Understanding of Project

## 1. Overall Project Purpose
VoiceBridge AI is a multilingual voice-assisted application designed to help non-English speaking citizens determine their eligibility for various government schemes. The application processes voice inputs in English, Hindi, and Marathi, transcribes the speech, extracts profile attributes (such as Name, Age, Income, State, Gender, Category), predicts the user's intent, matches the profile against a scheme database, and returns the eligibility status.

## 2. Supabase Database Status & Schema
**Status:** The current Supabase configuration is a placeholder and has **not** been fully configured or integrated into a live backend. This is treated as a **pending integration task**.

**Identified Components for Reuse:**
*   **Authentication:** Supabase JWT logic is present in `backend/middleware/authMiddleware.js` and `authRoutes.js`.
*   **Existing Database Models (`backend/models/`):**
    *   `userModel.js`: Manages user data.
    *   `schemeModel.js`: Defines government schemes and eligibility criteria rules (operator, value, criteria_type).
    *   `applicationModel.js`: Tracks user applications for specific schemes.
    *   `documentModel.js`: Manages document references required for applications.
*   **Storage:** Document upload placeholders exist (`documentController.js`), which will eventually use Supabase Storage buckets.
*   **Actionable Note:** Do not assume the connection is functional. The database schemas will need to be provisioned on a real Supabase instance using SQL migrations or the Supabase dashboard in future phases.

## 3. Team Contributions & Notebook Analysis

### 3.1. ASR (Automatic Speech Recognition)
*   **Notebook:** `VoiceBridgeAi_WHISPER_model (1).ipynb`
*   **Contribution:** An ASR pipeline that receives audio files and returns transcribed text. 
*   **Implementation:** Provides a lightweight Flask API (`run_server`, `run_server_8002`) exposing a `/transcribe` endpoint.
*   **Inference Functions:** `transcribe_audio`, `transcribe_public`.
*   **Artifact Status:** The notebook does not define exact local artifact paths. It relies on downloading a generic Whisper model via `transformers` (likely `openai/whisper-tiny` or `base`). **No inference-ready ASR models are available in the local workspace.**

### 3.2. Hindi NLP Pipeline
*   **Notebook:** `Hindi_classification (1).ipynb`
*   **Contribution:** Custom Named Entity Recognition (NER) pipeline for Hindi, capable of extracting 8 profile entities (17 BIO tags). It also includes translation/transliteration utilities to canonicalize Hindi terms into English for scheme matching.
*   **Model Architecture:** `xlm-roberta-base` fine-tuned for token classification (NER).
*   **Inference Functions:** `extract_profile`, `normalize_profile`, `translate_hindi_to_english`, `clean_itrans_name`, `check_eligibility`.
*   **Artifact Status:** 
    *   Models were trained and saved to Google Drive paths: `/content/drive/MyDrive/VoiceBridge_AI/Hindi_NER_Model` and `/content/drive/MyDrive/VoiceBridge_AI/Hindi_NER_Model_Realistic`.
    *   **Availability:** These artifacts are **missing** from the current local workspace. They must be downloaded from the Google Drive environment before inference can run.

### 3.3. Marathi NLP Pipeline
*   **Notebook:** `MarathiClassi.ipynb`
*   **Contribution:** A dual-model approach implementing both Marathi NER (entity extraction) and Intent Classification.
*   **Model Architecture:**
    *   NER: Fine-tuned `l3cube-pune/marathi-ner`.
    *   Intent: Fine-tuned `l3cube-pune/marathi-bert-v2` for sequence classification.
*   **Inference Functions:** `voicebridge_marathi_nlp`, `extract_profile`, `predict_intent`, `standardize_profile`, `process_profile`.
*   **Artifact Status:**
    *   Saved in Google Colab ephemeral paths: `/content/voicebridge_marathi_intent` (and `_v2`), `/content/voicebridge_marathi_ner`, and `./marathi_ner_model`.
    *   **Availability:** These artifacts are **missing** from the current local workspace and need to be retrieved or retrained.

### 3.4. English NLP Pipeline
*   **Notebook:** `VoiceBridge_English_NLP_1 (1).ipynb`
*   **Contribution:** A traditional machine learning NLP approach (likely CRF via `sklearn-crfsuite` and NLTK) rather than a heavy transformer model.
*   **Inference Functions:** `process_english_input_safe`, `map_to_canonical_profile`, `evaluate_scheme`, `predict_intent`.
*   **Artifact Status:**
    *   The notebook indicates feature extraction functions (`word2features`, `sent2features`), meaning it likely relies on `.pkl` files (Pickled CRF models) or NLTK datasets.
    *   **Availability:** No `.pkl` or weights files are currently present in the workspace.

## 4. Current Limitations & Blockers
1.  **Missing Artifacts:** None of the trained machine learning models (Hindi NER, Marathi NER/Intent, English CRF) or the Whisper model weights exist in the local project workspace. The code references external Google Drive or Colab paths.
2.  **Disconnected Backend:** The Node.js backend controllers (`chatController.js`) are placeholders. They do not yet invoke the NLP pipelines.
3.  **Dummy Database:** Supabase queries in the Node.js backend will fail because the database schema has not been actively deployed to a live project yet.
4.  **Hinglish/Minglish Support:** Based on the notebook analysis, the models are trained explicitly on native scripts (Devanagari for Hindi/Marathi) and English. Support for code-mixed languages (Hinglish/Minglish) is **not natively supported** by the current configurations and would yield unpredictable results.
