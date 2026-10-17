/**
 * SahAIta — Backend Server (Node.js + Express)
 *
 * This is the foundation entry point for the Express backend. It wires up
 * the API routes, middleware, and error handler. The actual AI chat, OCR,
 * and PDF generation logic will be implemented in later phases — the
 * corresponding routes and controllers are placeholders for now.
 *
 * Run with: node backend/server.js  (after `npm install` in /backend)
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import schemeRoutes from './routes/schemeRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';       // PLACEHOLDER — AI chat
import pdfRoutes from './routes/pdfRoutes.js';         // PLACEHOLDER — PDF generation
import asrRoutes from './routes/asrRoutes.js';
import nlpRoutes from './routes/nlpRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ----- Global middleware -----
app.use(cors());
app.use(express.json());

// ----- Health check -----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sahaita-backend' });
});

// ----- API routes -----
app.use('/api/auth', authRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);     // PLACEHOLDER
app.use('/api/pdf', pdfRoutes);       // PLACEHOLDER
app.use('/api/asr', asrRoutes);
app.use('/api/nlp', nlpRoutes);

// ----- Error handler (must be last) -----
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`SahAIta backend running on port ${PORT}`);
});
