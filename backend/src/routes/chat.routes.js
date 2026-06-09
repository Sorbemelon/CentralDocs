import { Router } from "express";
import {
  createSavedChatSession,
  deleteSavedChatSession,
  getSavedChatSessionDetail,
  listSavedChatSessions,
  updateChatSelection,
  updateSavedChatSession,
} from "../services/chats/chatSession.service.js";
import { createUserChatMessage } from "../services/chats/chatMessage.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const chatRouter = Router();

chatRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await listSavedChatSessions({
      demoSessionId: req.demoSessionId,
    });

    res.json({
      status: "ready",
      ...result,
    });
  }),
);

chatRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const result = await createSavedChatSession({
      demoSessionId: req.demoSessionId,
      body: req.body,
    });

    res.status(201).json({
      status: "created",
      ...result,
    });
  }),
);

chatRouter.get(
  "/:chatId",
  asyncHandler(async (req, res) => {
    const result = await getSavedChatSessionDetail({
      chatId: req.params.chatId,
      demoSessionId: req.demoSessionId,
    });

    res.json({
      status: "ready",
      ...result,
    });
  }),
);

chatRouter.patch(
  "/:chatId",
  asyncHandler(async (req, res) => {
    const result = await updateSavedChatSession({
      chatId: req.params.chatId,
      demoSessionId: req.demoSessionId,
      body: req.body,
    });

    res.json({
      status: "updated",
      ...result,
    });
  }),
);

chatRouter.delete(
  "/:chatId",
  asyncHandler(async (req, res) => {
    const result = await deleteSavedChatSession({
      chatId: req.params.chatId,
      demoSessionId: req.demoSessionId,
    });

    res.json(result);
  }),
);

chatRouter.patch(
  "/:chatId/selection",
  asyncHandler(async (req, res) => {
    const result = await updateChatSelection({
      chatId: req.params.chatId,
      demoSessionId: req.demoSessionId,
      body: req.body,
    });

    res.json({
      status: "updated",
      ...result,
    });
  }),
);

chatRouter.post(
  "/:chatId/messages",
  asyncHandler(async (req, res) => {
    const result = await createUserChatMessage({
      chatId: req.params.chatId,
      demoSessionId: req.demoSessionId,
      body: req.body,
    });

    res.status(201).json({
      status: "created",
      ...result,
    });
  }),
);
