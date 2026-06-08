export function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || error.status || 500;
  const safeStatusCode = statusCode >= 400 && statusCode < 600 ? statusCode : 500;

  const body = {
    error: {
      code: error.code || "INTERNAL_SERVER_ERROR",
      message:
        safeStatusCode === 500 && !error.statusCode
          ? "Internal server error."
          : error.message,
    },
  };

  if (error.details) {
    body.error.details = error.details;
  }

  res.status(safeStatusCode).json(body);
}
