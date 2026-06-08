import mongoose from "mongoose";
import { LIFECYCLE_STATUS, LIFECYCLE_STATUSES } from "../constants/lifecycle.constants.js";

const { ObjectId } = mongoose.Schema.Types;

const chatSessionSchema = new mongoose.Schema(
  {
    demoSessionId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    currentSelectedDocumentIds: [{ type: ObjectId, ref: "Document" }],
    currentSelectedFolderIds: [{ type: ObjectId, ref: "Folder" }],
    rollingSummary: {
      type: String,
      default: null,
    },
    messageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    aiPromptCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    lifecycleStatus: {
      type: String,
      enum: LIFECYCLE_STATUSES,
      default: LIFECYCLE_STATUS.ACTIVE,
      required: true,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

chatSessionSchema.index({ demoSessionId: 1, lifecycleStatus: 1 });
chatSessionSchema.index({ lastMessageAt: -1 });
chatSessionSchema.index({ archivedAt: 1 });

export const ChatSession =
  mongoose.models.ChatSession || mongoose.model("ChatSession", chatSessionSchema);
