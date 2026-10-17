# intent_logreg - VoiceBridge English intent model
TF-IDF (1-2 grams, sublinear_tf) + LogisticRegression, one sklearn Pipeline in `intent_pipeline.joblib`.
Input: raw text (no preprocessing). Output: intent + confidence.
Intents (11): application_guidance, application_status, benefit_information, document_requirements,
eligibility_check, greeting, help, profile_update, scheme_details, scheme_search, unknown.

    from predict import predict_intent
    predict_intent("What documents do I need to apply?")   # {'intent': ..., 'confidence': ...}

Provenance: this is the model integrated with NER and Supabase (notebook cells 154-174, saved there as
`..._reconstructed_final.joblib`). Rebuilt by re-running the notebook's cells 41-76 and 154-174 on
VoiceBridge_English_Intent_Dataset_1100.csv. It matches the recorded outputs: 1,281 training rows,
1,258 features, 95.51% on 156 test sentences, 28/31 on the benchmark, and confidences 0.8291 / 0.7747
on the sentences in cells 255 / 251. It is a retrain, not the original bytes.
Built with the pinned versions in requirements.txt. Tests: `python tests/test_intent.py`.
