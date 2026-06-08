import { Router } from "express";
import { getMongoStatus } from "../db/connectMongo.js";
import { listTrashedDocuments } from "../services/documents/document.service.js";
import { listTrashedFolders } from "../services/folders/folder.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const trashRouter = Router();

trashRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const folders = await listTrashedFolders({ demoSessionId: req.demoSessionId });
    const documents = await listTrashedDocuments({ demoSessionId: req.demoSessionId });

    res.json({
      status: "ready",
      folders,
      documents,
      counts: {
        folders: folders.length,
        documents: documents.length,
        total: folders.length + documents.length,
      },
      persistenceStatus: getMongoStatus(),
    });
  }),
);
