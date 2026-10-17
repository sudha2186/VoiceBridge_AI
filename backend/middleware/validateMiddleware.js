/**
 * Request validation middleware (placeholder).
 *
 * Will use a schema-validation library (e.g. zod or Joi) to validate
 * request bodies for auth, application, and document endpoints before
 * they reach controllers. For now this is a pass-through stub.
 */

export function validate(schema) {
  return (req, _res, next) => {
    // TODO: validate req.body against `schema` and return 400 on failure.
    next();
  };
}
