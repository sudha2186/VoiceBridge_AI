"""
VoiceBridge AI — Hindi and Marathi Speech-to-Text (ASR) Benchmark Evaluation
Evaluates Whisper Small accuracy with representative citizen utterances.
Computes Word Error Rate (WER) and Character Error Rate (CER).
"""

import os
import sys
import io
import json
import requests
from gtts import gTTS

sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def levenshtein_distance(seq1, seq2):
    """Computes Levenshtein edit distance between two sequences (words or characters)."""
    size_x = len(seq1) + 1
    size_y = len(seq2) + 1
    matrix = [[0] * size_y for _ in range(size_x)]
    for x in range(size_x):
        matrix[x][0] = x
    for y in range(size_y):
        matrix[0][y] = y

    for x in range(1, size_x):
        for y in range(1, size_y):
            if seq1[x-1] == seq2[y-1]:
                matrix[x][y] = matrix[x-1][y-1]
            else:
                matrix[x][y] = min(
                    matrix[x-1][y] + 1,      # deletion
                    matrix[x][y-1] + 1,      # insertion
                    matrix[x-1][y-1] + 1     # substitution
                )
    return matrix[size_x - 1][size_y - 1]

def compute_wer(ref: str, hyp: str) -> float:
    ref_words = ref.strip().split()
    hyp_words = hyp.strip().split()
    if not ref_words:
        return 0.0 if not hyp_words else 1.0
    dist = levenshtein_distance(ref_words, hyp_words)
    return dist / len(ref_words)

def compute_cer(ref: str, hyp: str) -> float:
    ref_chars = list(ref.replace(" ", ""))
    hyp_chars = list(hyp.replace(" ", ""))
    if not ref_chars:
        return 0.0 if not hyp_chars else 1.0
    dist = levenshtein_distance(ref_chars, hyp_chars)
    return dist / len(ref_chars)

BENCHMARK_CASES = [
    {
        "id": "ASR-HI-01",
        "lang": "hi",
        "ground_truth": "मेरा नाम राहुल शर्मा है। मैं ठाणे जिले में रहता हूँ। मेरी वार्षिक आय दो लाख रुपये है।",
        "desc": "Hindi citizen profile: Name (Rahul Sharma), District (Thane), Income (2 lakh rupees)"
    },
    {
        "id": "ASR-HI-02",
        "lang": "hi",
        "ground_truth": "मेरी जन्म तिथि पंद्रह अगस्त 1995 है और मैं किसान हूँ।",
        "desc": "Hindi DOB & Occupation: 15 August 1995, Farmer"
    },
    {
        "id": "ASR-MR-01",
        "lang": "mr",
        "ground_truth": "माझे नाव अमोल पाटील आहे. मी पुणे जिल्ह्यात राहतो. माझे वार्षिक उत्पन्न दोन लाख रुपये आहे.",
        "desc": "Marathi citizen profile: Name (Amol Patil), District (Pune), Income (2 lakh rupees)"
    },
    {
        "id": "ASR-MR-02",
        "lang": "mr",
        "ground_truth": "माझा जन्म 1986 मध्ये झाला आणि माझा मासिक पगार वीस हजार रुपये आहे.",
        "desc": "Marathi birth year & monthly salary: 1986, 20,000 monthly"
    }
]

def run_asr_evaluation():
    os.makedirs("scratch", exist_ok=True)
    results = []
    print("=" * 80)
    print("VoiceBridge AI — Whisper Small Hindi & Marathi ASR Evaluation")
    print("=" * 80)

    for case in BENCHMARK_CASES:
        audio_path = f"scratch/{case['id']}.mp3"
        print(f"\n[Benchmarking {case['id']}] ({case['lang'].upper()})")
        print(f"Description: {case['desc']}")
        print(f"Ground Truth: '{case['ground_truth']}'")

        # Synthesize audio with gTTS for benchmark evaluation
        tts = gTTS(text=case['ground_truth'], lang=case['lang'])
        tts.save(audio_path)

        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        # Send to Whisper Small ASR endpoint
        files = {"audio": (os.path.basename(audio_path), audio_bytes, "audio/mpeg")}
        data = {"language": case['lang']}
        res = requests.post(f"{BASE_URL}/api/asr/transcribe", files=files, data=data).json()

        transcript = res.get("text", "")
        print(f"Whisper Transcript: '{transcript}'")

        # Clean punctuation for fair CER/WER
        import re
        norm_ref = re.sub(r"[।.,!?]", "", case['ground_truth']).strip()
        norm_hyp = re.sub(r"[।.,!?]", "", transcript).strip()

        wer = compute_wer(norm_ref, norm_hyp)
        cer = compute_cer(norm_ref, norm_hyp)

        print(f"WER: {wer * 100:.2f}% | CER: {cer * 100:.2f}%")

        results.append({
            "id": case['id'],
            "lang": case['lang'],
            "desc": case['desc'],
            "ground_truth": case['ground_truth'],
            "transcript": transcript,
            "wer": round(wer * 100, 2),
            "cer": round(cer * 100, 2)
        })

    print("\n" + "=" * 80)
    print("SUMMARY RESULTS TABLE")
    print("=" * 80)
    print(f"{'ID':<12} | {'Lang':<5} | {'WER (%)':<8} | {'CER (%)':<8} | Transcript Snippet")
    print("-" * 80)
    for r in results:
        snip = (r['transcript'][:35] + '...') if len(r['transcript']) > 35 else r['transcript']
        print(f"{r['id']:<12} | {r['lang']:<5} | {r['wer']:<8.2f} | {r['cer']:<8.2f} | {snip}")
    print("=" * 80)

    # Save results to json
    with open("scratch/asr_benchmark_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    run_asr_evaluation()
