import mongoose from "mongoose";
import { EMPTY_DEMO_USAGE } from "../config/limits.js";

const demoQuotaWindowSchema = new mongoose.Schema(
  {
    identityHash: {
      type: String,
      required: true,
      trim: true,
    },
    windowStartedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usage: {
      uploadedFiles: {
        type: Number,
        default: EMPTY_DEMO_USAGE.uploadedFiles,
      },
      aiPrompts: {
        type: Number,
        default: EMPTY_DEMO_USAGE.aiPrompts,
      },
      generatedDocuments: {
        type: Number,
        default: EMPTY_DEMO_USAGE.generatedDocuments,
      },
      storageBytes: {
        type: Number,
        default: EMPTY_DEMO_USAGE.storageBytes,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

demoQuotaWindowSchema.index({ identityHash: 1, windowStartedAt: 1 }, { unique: true });
demoQuotaWindowSchema.index({ identityHash: 1, expiresAt: 1 });
demoQuotaWindowSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const DemoQuotaWindow =
  mongoose.models.DemoQuotaWindow || mongoose.model("DemoQuotaWindow", demoQuotaWindowSchema);
