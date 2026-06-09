import multer from "multer";
import { UPLOAD_ERROR_CODE, UPLOAD_LIMITS } from "../constants/upload.constants.js";
import { createHttpError } from "../utils/httpError.js";

const multipartUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 2,
    fileSize: UPLOAD_LIMITS.maxMultipartFileBytes,
    fields: 5,
  },
});

function mapMulterError(error) {
  if (!error) {
    return null;
  }
  if (error.code === "LIMIT_FILE_SIZE") {
    return createHttpError(
      413,
      "Uploaded file exceeds the maximum supported request size.",
      UPLOAD_ERROR_CODE.FILE_TOO_LARGE,
    );
  }
  if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
    return createHttpError(
      400,
      "Only one upload file is allowed per request.",
      UPLOAD_ERROR_CODE.TOO_MANY_FILES,
    );
  }

  return createHttpError(
    400,
    "Upload request could not be parsed.",
    UPLOAD_ERROR_CODE.INVALID_REQUEST,
  );
}

export function uploadSingleDocumentMiddleware(req, res, next) {
  multipartUpload.single("file")(req, res, (error) => {
    const mappedError = mapMulterError(error);
    if (mappedError) {
      next(mappedError);
      return;
    }

    req.files = req.file ? [req.file] : [];
    next();
  });
}
