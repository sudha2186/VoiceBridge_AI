/**
 * Scheme controller.
 *
 * Handles CRUD for the government scheme catalog (`schemes` table).
 * In this foundation phase these are placeholders — the Supabase
 * client in the frontend reads the catalog directly via RLS.
 *
 * Endpoints:
 *   GET    /api/schemes          — list all schemes (with optional category filter)
 *   GET    /api/schemes/:id      — get a single scheme
 *   POST   /api/schemes          — create (admin only, future)
 *   PUT    /api/schemes/:id      — update (admin only, future)
 *   DELETE /api/schemes/:id      — delete (admin only, future)
 */

export function listSchemes(_req, res) {
  res.status(501).json({ error: 'Scheme listing will be implemented in a later phase.' });
}

export function getScheme(_req, res) {
  res.status(501).json({ error: 'Scheme detail will be implemented in a later phase.' });
}

export function createScheme(_req, res) {
  res.status(501).json({ error: 'Scheme creation will be implemented in a later phase.' });
}

export function updateScheme(_req, res) {
  res.status(501).json({ error: 'Scheme update will be implemented in a later phase.' });
}

export function deleteScheme(_req, res) {
  res.status(501).json({ error: 'Scheme deletion will be implemented in a later phase.' });
}
