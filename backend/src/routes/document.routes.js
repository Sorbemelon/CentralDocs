import { Router } from "express";
import { uploadSingleDocumentMiddleware } from "../middleware/uploadMiddleware.js";
import {
  createDocumentDownloadUrl,
} from "../services/documents/documentDownload.service.js";
import {
  getDocumentById,
  getDocumentPreviewById,
  listDocuments,
  moveDocument,
  restoreDocument,
  softDeleteDocument,
} from "../services/documents/document.service.js";
import {
  getUploadDocumentStatus,
  retryDocumentProcessing,
  uploadDocumentForDemo,
} from "../services/uploads/uploadDocument.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const documentRouter = Router();

documentRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await listDocuments({
      query: req.query,
      demoSessionId: req.demoSessionId,
    });

    res.json({
      status: "ready",
      ...result,
    });
  }),
);

documentRouter.post(
  "/upload",
  uploadSingleDocumentMiddleware,
  asyncHandler(async (req, res) => {
    const result = await uploadDocumentForDemo({
      demoSessionId: req.demoSessionId,
      files: req.files || [],
      body: req.body || {},
    });

    res.status(201).json({
      status: "created",
      ...result,
    });
  }),
);

documentRouter.get(
  "/:documentId/preview",
  asyncHandler(async (req, res) => {
    const preview = await getDocumentPreviewById({
      documentId: req.params.documentId,
      demoSessionId: req.demoSessionId,
    });

    res.json({
      status: "ready",
      preview,
    });
  }),
);

documentRouter.get(
  "/:documentId/status",
  asyncHandler(async (req, res) => {
    const documentStatus = await getUploadDocumentStatus({
      documentId: req.params.documentId,
      demoSessionId: req.demoSessionId,
    });

    res.json(documentStatus);
  }),
);

documentRouter.patch(
  "/:documentId/move",
  asyncHandler(async (req, res) => {
    const document = await moveDocument({
      documentId: req.params.documentId,
      demoSessionId: req.demoSessionId,
      folderId: req.body?.folderId || null,
    });

    res.json({
      status: "moved",
      document,
    });
  }),
);

documentRouter.post(
  "/:documentId/retry",
  asyncHandler(async (req, res) => {
    const result = await retryDocumentProcessing({
      documentId: req.params.documentId,
      demoSessionId: req.demoSessionId,
    });

    res.json(result);
  }),
);

documentRouter.post(
  "/:documentId/download-url",
  asyncHandler(async (req, res) => {
    const download = await createDocumentDownloadUrl({
      documentId: req.params.documentId,
      demoSessionId: req.demoSessionId,
      requestedFilename: req.body?.filename || null,
    });

    res.json(download);
  }),
);

documentRouter.post(
  "/:documentId/restore",
  asyncHandler(async (req, res) => {
    const document = await restoreDocument({
      documentId: req.params.documentId,
      demoSessionId: req.demoSessionId,
    });

    res.json({
      status: "restored",
      document,
    });
  }),
);

documentRouter.get(
  "/:documentId",
  asyncHandler(async (req, res) => {
    const document = await getDocumentById({
      documentId: req.params.documentId,
      query: req.query,
      demoSessionId: req.demoSessionId,
    });

    res.json({
      status: "ready",
      document,
    });
  }),
);

documentRouter.delete(
  "/:documentId",
  asyncHandler(async (req, res) => {
    const document = await softDeleteDocument({
      documentId: req.params.documentId,
      demoSessionId: req.demoSessionId,
    });

    res.json({
      status: "trashed",
      document,
    });
  }),
);
