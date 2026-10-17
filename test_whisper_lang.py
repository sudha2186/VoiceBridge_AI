import sys
import os
import torch
import numpy as np

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from transformers import WhisperProcessor, WhisperForConditionalGeneration

wh_dir = os.path.join(os.path.dirname(__file__), "ai_service", "models", "whisper_small")
print(f"Loading Whisper from: {wh_dir}")
processor = WhisperProcessor.from_pretrained(wh_dir)
model = WhisperForConditionalGeneration.from_pretrained(wh_dir)
model.eval()

# Create 2 seconds of 16kHz audio with a gentle tone or silence
sr = 16000
t = np.linspace(0, 2, sr * 2, endpoint=False)
tone = (0.2 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)

inputs = processor(tone, sampling_rate=sr, return_tensors="pt")

for lang in ["hi", "mr", "en"]:
    print(f"\n--- Testing language: {lang} ---")
    f_ids = processor.get_decoder_prompt_ids(language=lang, task="transcribe")
    with torch.no_grad():
        out = model.generate(
            inputs.input_features,
            forced_decoder_ids=f_ids,
            max_new_tokens=40,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3
        )
    decoded = processor.batch_decode(out, skip_special_tokens=True)[0]
    print(f"Decoded with forced_decoder_ids: '{decoded}'")
    
    # Also test with language/task direct
    try:
        with torch.no_grad():
            out2 = model.generate(
                inputs.input_features,
                language=lang,
                task="transcribe",
                forced_decoder_ids=None,
                max_new_tokens=40,
                repetition_penalty=1.2,
                no_repeat_ngram_size=3
            )
        decoded2 = processor.batch_decode(out2, skip_special_tokens=True)[0]
        print(f"Decoded with language/task flag: '{decoded2}'")
    except Exception as e:
        print(f"Direct language/task error: {e}")

print("\nWhisper test complete.")
