# VoiceBridge AI - Project Architecture & Integration Design

## 1. High-Level Architecture Flow

VoiceBridge AI utilizes a microservices architecture to separate standard web operations (auth, database queries) from heavy ML processing (audio transcription, natural language processing).

```mermaid
flowchart TD
    Client[Frontend (React/Vite)] -->|Auth, DB Ops, UI| NodeBackend[Node.js Backend (Express)]
    
    subscript Audio Processing
    Client -->|Audio Blob| NodeBackend
    NodeBackend -->|Multipart Audio Form| ASRService[Python ASR Service - Whisper]
    ASRService -->|Transcribed Text| NodeBackend
    end
    
    subscript NLP Processing
    NodeBackend -->|JSON: Text + Lang| NLPService[Unified Python NLP Service]
    NLPService -->|Route: English| EngNLP(CRF / NLTK)
    NLPService -->|Route: Hindi| HiNLP(XLM-RoBERTa + Translation)
    NLPService -->|Route: Marathi| MrNLP(L3Cube NER & Intent)
    EngNLP --> ProfileNormalizer[Canonical Profile Normalizer]
    HiNLP --> ProfileNormalizer
    MrNLP --> ProfileNormalizer
    ProfileNormalizer -->|Unified JSON Payload| NodeBackend
    end

    subscript Eligibility Check
    NodeBackend -->|Profile Data| Supabase[(Supabase DB)]
    Supabase -->|Matched Schemes| NodeBackend
    NodeBackend -->|Results| Client
    end
```

## 2. Component Responsibilities

1.  **Frontend (React/Vite):** Captures user audio, displays transcriptions, handles confirmation steps (verifying extracted entities), and renders scheme eligibility.
2.  **Node.js Backend (Express):** 
    *   `asrRoutes.js`: Proxies audio blobs to the Python ASR Service.
    *   `chatController.js`: Receives transcribed text, requests entity/intent extraction from the Python NLP Service, and queries Supabase.
3.  **Python ASR Service:** Receives `.wav`/`.mp3` streams, uses Whisper to transcribe text, and returns a plain string.
4.  **Unified Python NLP Service (Proposed):** A unified FastAPI/Flask app that loads the English, Hindi, and Marathi pipelines into memory. Routes requests based on a `language` flag.
5.  **Supabase Database (Pending):** Stores user profiles, application history, and the eligibility rules schema for government schemes.

## 3. Unified NLP Request and Response Format

To ensure the Node.js backend can seamlessly handle results regardless of the spoken language, the Unified Python NLP service must standardize the API contracts. 

*(Note: Hinglish and Minglish are excluded from this design as the existing notebook configurations do not explicitly support code-mixed inputs reliably).*

**HTTP POST `/api/nlp/process`**

**Request Payload:**
```json
{
  "text": "I am a 25 year old male from Maharashtra earning 50000. Am I eligible for any schemes?",
  "language": "en" 
  // Allowed values: "en" (English), "hi" (Hindi), "mr" (Marathi)
}
```

**Response Payload:**
The output must map all entities extracted by the language-specific models into canonical English keys, translating/transliterating as necessary (which the Hindi pipeline already supports).

```json
{
  "intent": "check_eligibility",
  "entities": {
    "name": null,
    "age": 25,
    "gender": "Male",
    "state": "Maharashtra",
    "district": null,
    "income": 50000,
    "category": null,
    "occupation": null
  },
  "confidence": 0.92,
  "requires_clarification": false
}
```
*If critical parameters are missing, `requires_clarification` can be set to true, prompting the Node.js backend to ask the user a follow-up question before hitting Supabase.*
