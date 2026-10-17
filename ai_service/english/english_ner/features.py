"""
CRF feature extraction for the VoiceBridge English NER model.

!!  DO NOT EDIT  !!
This is the EXACT feature function the saved CRF was trained with
(notebook cell 84, "Step 7: Feature Extraction").  A CRF only works with
the same feature names/values it saw in training.  If you add or rename a
feature, the model will silently predict "O" for most tokens.

Note: a later notebook cell (cell 100) defines a slightly different
word2features (adds ".isdigit" on neighbouring words).  That version was
used for an experimental dataset and was NEVER used to train the saved
model.  Do not use it with ner_crf.joblib.

Features are purely orthographic / contextual: no POS tags, no gazetteers,
no spaCy/NLTK.  Nothing else needs to be installed for feature extraction.
"""


def word2features(sentence, i):
    word = sentence[i]

    features = {
        "bias": 1.0,
        "word.lower": word.lower(),
        "word[-3:]": word[-3:],
        "word[-2:]": word[-2:],
        "word.isupper": word.isupper(),
        "word.istitle": word.istitle(),
        "word.isdigit": word.isdigit(),
        "word.length": len(word),
    }

    # Previous token
    if i > 0:
        prev_word = sentence[i - 1]
        features.update({
            "-1:word.lower": prev_word.lower(),
            "-1:word.istitle": prev_word.istitle(),
            "-1:word.isupper": prev_word.isupper(),
        })
    else:
        features["BOS"] = True

    # Next token
    if i < len(sentence) - 1:
        next_word = sentence[i + 1]
        features.update({
            "+1:word.lower": next_word.lower(),
            "+1:word.istitle": next_word.istitle(),
            "+1:word.isupper": next_word.isupper(),
        })
    else:
        features["EOS"] = True

    return features


def sent2features(tokens):
    return [word2features(tokens, i) for i in range(len(tokens))]
