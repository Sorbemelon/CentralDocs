import mongoose from "mongoose";
import { DEMO_LIMITS, EMPTY_DEMO_USAGE } from "../config/limits.js";

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
      enum: ["active", "expired"],
      default: "active",
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
      enum: ["not_started", "accepted", "pending", "completed", "failed"],
      default: "not_started",
    },
  },
  {
    versionKey: false,
  },
);

export const DemoSession =
  mongoose.models.DemoSession || mongoose.model("DemoSession", demoSessionSchema);
