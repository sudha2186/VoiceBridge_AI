# SahAIta Backend

Express.js backend for the AI Government Scheme Assistant.

## Structure

```
backend/
├── server.js              # Express app entry point
├── package.json
├── .env.example           # Environment variable template
├── routes/                # Route definitions (URL → controller mapping)
│   ├── authRoutes.js
│   ├── schemeRoutes.js
│   ├── applicationRoutes.js
│   ├── documentRoutes.js
│   ├── chatRoutes.js          # PLACEHOLDER — AI chat
│   └── pdfRoutes.js           # PLACEHOLDER — PDF generation
├── controllers/           # Request handlers (business logic)
│   ├── authController.js
│   ├── schemeController.js
│   ├── applicationController.js
│   ├── documentController.js
│   ├── chatController.js      # PLACEHOLDER — AI chat
│   └── pdfController.js       # PLACEHOLDER — PDF generation
├── models/                # Data-access layer (Supabase queries)
│   ├── userModel.js
│   ├── schemeModel.js
│   ├── applicationModel.js
│   └── documentModel.js
└── middleware/            # Express middleware
    ├── authMiddleware.js     # JWT verification
    ├── errorMiddleware.js    # Global error handler
    └── validateMiddleware.js # Request validation (placeholder)
```

## Running

```bash
cd backend
npm install
npm run dev
```

## API Endpoints

| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | `/api/health` | — | Active |
| GET | `/api/auth/me` | JWT | Active |
| POST | `/api/auth/register` | — | Placeholder |
| POST | `/api/auth/login` | — | Placeholder |
| GET | `/api/schemes` | — | Placeholder |
| GET | `/api/schemes/:id` | — | Placeholder |
| GET | `/api/applications` | JWT | Placeholder |
| POST | `/api/applications` | JWT | Placeholder |
| GET | `/api/documents` | JWT | Placeholder |
| POST | `/api/documents` | JWT | Placeholder |
| POST | `/api/chat/message` | JWT | Placeholder (AI chat) |
| POST | `/api/pdf/generate/:id` | JWT | Placeholder (PDF) |

## Notes

- Authentication is handled via Supabase Auth on the frontend. The backend
  JWT middleware is available for future API-only flows.
- The AI chat, OCR, and PDF generation routes/controllers are placeholders
  and will be implemented in subsequent phases.
