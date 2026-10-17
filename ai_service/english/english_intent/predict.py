"""
    from predict import predict_intent
    predict_intent("Which documents do I need to submit?")
    # {'intent': 'document_requirements', 'confidence': 0.61}
"""
from pathlib import Path
import joblib

_pipeline = None


def predict_intent(text):
    global _pipeline
    if _pipeline is None:
        _pipeline = joblib.load(Path(__file__).resolve().parent / "intent_pipeline.joblib")
    probs = _pipeline.predict_proba([text])[0]
    best = probs.argmax()
    return {"intent": str(_pipeline.classes_[best]), "confidence": round(float(probs[best]), 4)}
