import express from 'express';

const router = express.Router();

// POST /api/nlp/extract
router.post('/extract', async (req, res) => {
  try {
    const { text, language, previous_profile } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text is required for NLP extraction'
      });
    }

    const nlpApiUrl = process.env.NLP_API_URL || 'http://127.0.0.1:8000/api/nlp/extract';

    const response = await fetch(nlpApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        language: language || 'en',
        previous_profile: previous_profile || null
      })
    });

    const result = await response.json();
    return res.status(response.status).json(result);
  } catch (error) {
    console.error('NLP Proxy Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to connect to NLP service',
      details: error.message
    });
  }
});

// POST /api/nlp/intent
router.post('/intent', async (req, res) => {
  try {
    const { text, language } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text is required for intent classification'
      });
    }

    const intentApiUrl = process.env.INTENT_API_URL || 'http://127.0.0.1:8000/api/nlp/intent';

    const response = await fetch(intentApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        language: language || 'en'
      })
    });

    const result = await response.json();
    return res.status(response.status).json(result);
  } catch (error) {
    console.error('NLP Intent Proxy Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to connect to Intent service',
      details: error.message
    });
  }
});

export default router;
