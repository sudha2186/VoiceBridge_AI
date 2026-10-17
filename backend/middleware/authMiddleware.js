/**
 * JWT authentication middleware.
 *
 * Verifies the Bearer token in the Authorization header. On success,
 * attaches the decoded payload (user id, email) to req.user so downstream
 * controllers can identify the authenticated citizen.
 *
 * Usage: import { protect } from './middleware/authMiddleware.js';
 *        router.get('/me', protect, controller);
 */

import jwt from 'jsonwebtoken';

export function protect(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authorized — no token provided.' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, iat, exp }
    next();
  } catch {
    return res.status(401).json({ error: 'Not authorized — invalid or expired token.' });
  }
}
