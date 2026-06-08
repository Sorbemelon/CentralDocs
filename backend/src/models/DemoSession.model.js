import mongoose from "mongoose";
import { DEMO_LIMITS, EMPTY_DEMO_USAGE } from "../config/limits.js";
import {
  CLEANUP_STATUS,
  CLEANUP_STATUSES,
  DEMO_SESSION_STATUS,
  DEMO_SESSION_STATUSES,
} from "../constants/lifecycle.constants.js";

const demoSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: DEMO_SESSION_STATUSES,
      default: DEMO_SESSION_STATUS.ACTIVE,
      index: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastActiveAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    limits: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: () => ({ ...DEMO_LIMITS }),
    },
    usage: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: () => ({ ...EMPTY_DEMO_USAGE }),
    },
    cleanupStatus: {
      type: String,
      enum: CLEANUP_STATUSES,
      default: CLEANUP_STATUS.NOT_STARTED,
    },
  },
  {
    versionKey: false,
  },
);

export const DemoSession =
  mongoose.models.DemoSession || mongoose.model("DemoSession", demoSessionSchema);
