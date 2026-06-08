export class HttpError extends Error {
  constructor(statusCode, message, code = "HTTP_ERROR", details = undefined) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function createHttpError(statusCode, message, code, details) {
  return new HttpError(statusCode, message, code, details);
}
