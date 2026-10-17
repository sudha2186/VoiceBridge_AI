"""
Tokenizer + BIO decoding for the VoiceBridge English NER model.

The tokenizer MUST be the one used when the training data was built
(notebook cell 79, tokenize_text): words and punctuation become separate
tokens.  Do NOT use text.split() - then "Mumbai." stays one token, the
features no longer match training, and entities come back with the
full-stop attached ("Mumbai." -> LOCATION).
"""
import re

_TOKEN_RE = re.compile(r"\w+|[^\w\s]")


def tokenize(text):
    """'I am from Pune.' -> ['I', 'am', 'from', 'Pune', '.']"""
    return _TOKEN_RE.findall(text)


def decode_entities(tokens, tags):
    """
    Turn BIO tags into entity spans.
    Returns [{"text": "third year", "label": "YEAR_OF_STUDY"}, ...]
    (same output shape as the notebook's final inference module).
    """
    entities = []
    current_tokens = []
    current_type = None

    for token, tag in zip(tokens, tags):
        if tag == "O":
            if current_tokens:
                entities.append({"text": " ".join(current_tokens), "label": current_type})
                current_tokens, current_type = [], None
            continue

        prefix, entity_type = tag.split("-", 1)

        if prefix == "B":
            if current_tokens:
                entities.append({"text": " ".join(current_tokens), "label": current_type})
            current_tokens, current_type = [token], entity_type
        else:  # "I"
            if current_tokens and current_type == entity_type:
                current_tokens.append(token)
            else:  # stray I- tag: start a new entity
                if current_tokens:
                    entities.append({"text": " ".join(current_tokens), "label": current_type})
                current_tokens, current_type = [token], entity_type

    if current_tokens:
        entities.append({"text": " ".join(current_tokens), "label": current_type})

    return entities
