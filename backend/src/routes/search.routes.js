import { Router } from "express";
import { semanticSearch } from "../services/search/semanticSearch.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const searchRouter = Router();

searchRouter.post(
  "/semantic",
  asyncHandler(async (req, res) => {
    const result = await semanticSearch({
      body: req.body,
      demoSessionId: req.demoSessionId,
    });

    res.json(result);
  }),
);
