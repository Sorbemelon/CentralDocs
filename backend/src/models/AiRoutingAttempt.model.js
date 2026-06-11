import mongoose from "mongoose";
import {
  AI_ROUTING_ACTION_TYPES,
  AI_ROUTING_STATUS,
  AI_ROUTING_STATUSES,
} from "../constants/ai.constants.js";

const aiRoutingAttemptSchema = new mongoose.Schema(
  {
    demoSessionId: {
      type: String,
      default: null,
      index: true,
    },
    actionType: {
      type: String,
      enum: AI_ROUTING_ACTION_TYPES,
      required: true,
      index: true,
    },
    model: {
      type: String,
      required: true,
      index: true,
    },
    keySlot: {
      type: Number,
      default: null,
      min: 0,
    },
    status: {
      type: String,
      enum: AI_ROUTING_STATUSES,
      default: AI_ROUTING_STATUS.FAILED,
      required: true,
    },
    errorType: {
      type: String,
      default: null,
    },
    isRateLimit: {
      type: Boolean,
      default: false,
      index: true,
    },
    fallbackLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

aiRoutingAttemptSchema.index({ demoSessionId: 1, createdAt: 1 });

export const AiRoutingAttempt =
  mongoose.models.AiRoutingAttempt ||
  mongoose.model("AiRoutingAttempt", aiRoutingAttemptSchema);
