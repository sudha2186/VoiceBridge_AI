/**
 * Global error-handling middleware.
 *
 * Express expects exactly 4 arguments to recognize an error handler.
 * Catches errors thrown by controllers and returns a consistent JSON shape.
 */

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
