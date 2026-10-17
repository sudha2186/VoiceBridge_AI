import express from 'express';
import multer from 'multer';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage()
});

// POST /api/asr/transcribe
router.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No audio file provided'
            });
        }

        const language = req.body?.language || 'en';

        const asrApiUrl = process.env.ASR_API_URL || 'http://127.0.0.1:8000/api/asr/transcribe';

        const formData = new FormData();

        const audioBlob = new Blob(
            [req.file.buffer],
            { type: req.file.mimetype }
        );

        formData.append(
            'audio',
            audioBlob,
            req.file.originalname
        );

        formData.append(
            'language',
            language
        );

        const response = await fetch(
            asrApiUrl,
            {
                method: 'POST',
                body: formData
            }
        );

        const result = await response.json();

        return res.status(response.status).json(result);

    } catch (error) {
        console.error('ASR Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Failed to connect to ASR service',
            details: error.message
        });
    }
});

export default router;