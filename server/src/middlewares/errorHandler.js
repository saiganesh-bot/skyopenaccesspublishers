export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.message || "Internal server error";

  const summary = `${req.method} ${req.originalUrl} -> ${status} ${message}`;
  // eslint-disable-next-line no-console
  console.error("[error]", summary);
  if (err.stack) {
    // eslint-disable-next-line no-console
    console.error(err.stack);
  }

  res.status(status).json({
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
};
