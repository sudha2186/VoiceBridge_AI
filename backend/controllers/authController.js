/**
 * Auth controller.
 *
 * Handles citizen authentication endpoints. In this foundation phase,
 * signup and login delegate to Supabase Auth from the frontend, so these
 * backend endpoints are lightweight wrappers / placeholders for issuing
 * a JWT session token if needed for API-only clients.
 *
 * Endpoints:
 *   POST /api/auth/register  — create account (placeholder)
 *   POST /api/auth/login     — sign in (placeholder)
 *   GET  /api/auth/me        — get current user from JWT
 */

import jwt from 'jsonwebtoken';

// POST /api/auth/register — PLACEHOLDER
export function register(_req, res) {
  res.status(501).json({ error: 'Registration is handled via Supabase Auth on the frontend.' });
}

// POST /api/auth/login — PLACEHOLDER
export function login(_req, res) {
  res.status(501).json({ error: 'Login is handled via Supabase Auth on the frontend.' });
}

// GET /api/auth/me — returns the authenticated user from the JWT payload.
export function getMe(req, res) {
  res.json({ user: req.user });
}

// Helper: issue a JWT for a given user (used by future API-only flows).
export function issueToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}
