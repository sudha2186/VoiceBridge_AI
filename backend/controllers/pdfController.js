/**
 * PDF controller — PLACEHOLDER.
 *
 * Will generate a downloadable PDF application from a saved application's
 * form_data. The generated PDF is stored in Supabase Storage and its URL
 * saved to applications.pdf_url. The app never auto-submits to government
 * sites — the citizen downloads and submits the PDF themselves.
 *
 * Endpoints:
 *   POST /api/pdf/generate/:applicationId  — generate PDF for an application
 *   GET  /api/pdf/download/:applicationId  — download the generated PDF
 */

export function generatePdf(_req, res) {
  res.status(501).json({ error: 'PDF generation will be implemented in a later phase.' });
}

export function downloadPdf(_req, res) {
  res.status(501).json({ error: 'PDF download will be implemented in a later phase.' });
}
