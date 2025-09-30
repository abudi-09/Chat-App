export const validateRequest = (/* schema */) => {
  return async (req, res, next) => {
    try {
      // No validation rules are currently enforced because the middleware
      // schema helper was removed. Callers that still import this module
      // expect the middleware to exist, so we simply advance to the next
      // handler to avoid a runtime crash.
      // If validation is required again, pass a schema and invoke it here.
      next();
    } catch (error) {
      console.error("Validation middleware error:", error);
      res.status(400).json({ message: "Request validation failed" });
    }
  };
};

export default validateRequest;
