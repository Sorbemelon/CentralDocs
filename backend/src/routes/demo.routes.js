import { Router } from "express";
import { DEMO_LIMITS } from "../config/limits.js";
import { DEMO_SESSION_COOKIE } from "../middleware/demoSessionMiddleware.js";
import {
  acceptDemoClear,
  createOrResumeDemoSession,
  getDemoSession,
} from "../services/demo/demoSession.service.js";
import { getDemoGuideFromManifest } from "../services/mockData/mockManifest.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createHttpError } from "../utils/httpError.js";

export const demoRouter = Router();

const COOKIE_MAX_AGE_MS = DEMO_LIMITS.sessionLifetimeDays * 24 * 60 * 60 * 1000;

function setDemoSessionCookie(res, sessionId) {
  res.cookie(DEMO_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

demoRouter.post(
  "/session",
  asyncHandler(async (req, res) => {
    const session = await createOrResumeDemoSession(req.demoSessionId);
    setDemoSessionCookie(res, session.sessionId);

    res.status(201).json({
      status: "ready",
      mode: session.persistence === "mongodb" ? "persistent" : "foundation_memory",
      session,
    });
  }),
);

demoRouter.get(
  "/session",
  asyncHandler(async (req, res) => {
    const session = await getDemoSession(req.demoSessionId);
    if (!session) {
      throw createHttpError(
        404,
        "No active demo session was found. Create one with POST /api/demo/session.",
        "DEMO_SESSION_NOT_FOUND",
      );
    }

    res.json({
      status: "ready",
      mode: session.persistence === "mongodb" ? "persistent" : "foundation_memory",
      session,
    });
  }),
);

demoRouter.post(
  "/clear",
  asyncHandler(async (req, res) => {
    const result = await acceptDemoClear(req.demoSessionId);

    res.status(202).json({
      status: "clear_accepted",
      result,
      phaseLimit:
        "Phase 1A records the clear request only. Full hard-delete cleanup is implemented later.",
    });
  }),
);

demoRouter.get(
  "/guide",
  asyncHandler(async (req, res) => {
    const guide = await getDemoGuideFromManifest();

    res.json({
      status: "ready",
      guide,
      limits: DEMO_LIMITS,
    });
  }),
);
