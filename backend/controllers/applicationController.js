/**
 * Application controller.
 *
 * Handles citizen scheme applications (`applications` table).
 * Each application stores autofilled form_data as JSONB and an optional
 * pdf_url once a PDF is generated. Applications are never auto-submitted.
 *
 * Endpoints:
 *   GET    /api/applications          — list the current user's applications
 *   GET    /api/applications/:id      — get a single application
 *   POST   /api/applications          — create a new draft application
 *   PUT    /api/applications/:id      — update form data / status
 *   DELETE /api/applications/:id      — delete an application
 */

export function listApplications(_req, res) {
  res.status(501).json({ error: 'Application listing will be implemented in a later phase.' });
}

export function getApplication(_req, res) {
  res.status(501).json({ error: 'Application detail will be implemented in a later phase.' });
}

export function createApplication(_req, res) {
  res.status(501).json({ error: 'Application creation will be implemented in a later phase.' });
}

export function updateApplication(_req, res) {
  res.status(501).json({ error: 'Application update will be implemented in a later phase.' });
}

export function deleteApplication(_req, res) {
  res.status(501).json({ error: 'Application deletion will be implemented in a later phase.' });
}
