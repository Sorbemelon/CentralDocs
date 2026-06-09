import { Router } from "express";
import { DEMO_LIMITS } from "../config/limits.js";
import { DEMO_SESSION_COOKIE } from "../middleware/demoSessionMiddleware.js";
import {
  acceptDemoClear,
  createOrResumeDemoSession,
  getDemoSession,
} from "../services/demo/demoSession.service.js";
import { cleanupExpiredDemoSessions } from "../services/demo/demoExpiry.service.js";
import { buildDemoWorkspace } from "../services/demo/demoWorkspace.service.js";
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
  "/bootstrap",
  asyncHandler(async (req, res) => {
    await cleanupExpiredDemoSessions();
    const workspace = await buildDemoWorkspace();
    const session = await getDemoSession(req.demoSessionId);

    res.json({
      status: "ready",
      workspaceTitle: workspace.workspaceTitle,
      description: workspace.description,
      sampleQuestions: workspace.sampleQuestions,
      folders: workspace.folders,
      documents: workspace.documents,
      counts: workspace.counts,
      mockDataRules: workspace.mockDataRules,
      session: session
        ? {
            usage: session.usage,
            remaining: session.remaining,
            limits: session.limits,
            persistence: session.persistence,
            mode: session.mode,
            status: session.status,
            expiresAt: session.expiresAt,
          }
        : null,
      phaseLimit:
        "Phase 2B derives read-only mock workspace metadata from manifest only.",
    });
  }),
);

demoRouter.post(
  "/session",
  asyncHandler(async (req, res) => {
    const session = await createOrResumeDemoSession(req.demoSessionId);
    setDemoSessionCookie(res, session.sessionId);

    res.status(201).json({
      status: "ready",
      mode: session.mode,
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
        "SESSION_NOT_FOUND",
      );
    }

    res.json({
      status: session.status === "expired" ? "expired" : "ready",
      mode: session.mode,
      session,
      cleanup:
        session.status === "expired"
          ? {
              status: "pending_expired_session_cleanup",
              cleanupStatus: session.cleanupStatus,
            }
          : undefined,
    });
  }),
);

demoRouter.post(
  "/clear",
  asyncHandler(async (req, res) => {
    const result = await acceptDemoClear(req.demoSessionId);
    setDemoSessionCookie(res, result.session.sessionId);

    res.json(result);
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
