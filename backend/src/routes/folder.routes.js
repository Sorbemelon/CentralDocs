import { Router } from "express";
import {
  createFolder,
  listFolderDocuments,
  listFolders,
  renameFolder,
  restoreFolder,
  softDeleteFolder,
} from "../services/folders/folder.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const folderRouter = Router();

folderRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await listFolders({
      query: req.query,
      demoSessionId: req.demoSessionId,
    });

    res.json({
      status: "ready",
      ...result,
    });
  }),
);

folderRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const folder = await createFolder({
      demoSessionId: req.demoSessionId,
      name: req.body?.name,
      parentFolderId: req.body?.parentFolderId || null,
    });

    res.status(201).json({
      status: "created",
      folder,
    });
  }),
);

folderRouter.get(
  "/:folderId/documents",
  asyncHandler(async (req, res) => {
    const result = await listFolderDocuments({
      folderId: req.params.folderId,
      query: req.query,
      demoSessionId: req.demoSessionId,
    });

    res.json({
      status: "ready",
      ...result,
    });
  }),
);

folderRouter.patch(
  "/:folderId",
  asyncHandler(async (req, res) => {
    const folder = await renameFolder({
      folderId: req.params.folderId,
      demoSessionId: req.demoSessionId,
      name: req.body?.name,
    });

    res.json({
      status: "updated",
      folder,
    });
  }),
);

folderRouter.delete(
  "/:folderId",
  asyncHandler(async (req, res) => {
    const folder = await softDeleteFolder({
      folderId: req.params.folderId,
      demoSessionId: req.demoSessionId,
    });

    res.json({
      status: "trashed",
      folder,
    });
  }),
);

folderRouter.post(
  "/:folderId/restore",
  asyncHandler(async (req, res) => {
    const folder = await restoreFolder({
      folderId: req.params.folderId,
      demoSessionId: req.demoSessionId,
    });

    res.json({
      status: "restored",
      folder,
    });
  }),
);
