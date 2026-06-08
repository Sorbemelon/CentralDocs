import mongoose from "mongoose";
import { AI_MESSAGE_ACTION_TYPES } from "../constants/ai.constants.js";
import { CHAT_MESSAGE_STATUSES, CHAT_MESSAGE_STATUS, CHAT_ROLES } from "../constants/chat.constants.js";

const { ObjectId } = mongoose.Schema.Types;

const attachedDocumentSnapshotSchema = new mongoose.Schema(
  {
    documentId: { type: ObjectId, ref: "Document", required: true },
    documentTitle: { type: String, required: true },
    fileType: { type: String, default: null },
    folderName: { type: String, default: null },
    lifecycleStatus: { type: String, default: null },
  },
  { _id: false },
);

const attachedFolderSnapshotSchema = new mongoose.Schema(
  {
    folderId: { type: ObjectId, ref: "Folder", required: true },
    folderName: { type: String, required: true },
    resolvedDocumentCount: { type: Number, default: 0, min: 0 },
    lifecycleStatus: { type: String, default: null },
  },
  { _id: false },
);

const resolvedDocumentSnapshotSchema = new mongoose.Schema(
  {
    documentId: { type: ObjectId, ref: "Document", required: true },
    documentTitle: { type: String, required: true },
    folderId: { type: ObjectId, ref: "Folder", default: null },
    folderName: { type: String, default: null },
    sourceType: { type: String, default: null },
    fileKind: { type: String, default: null },
  },
  { _id: false },
);

export const referenceUsedSchema = new mongoose.Schema(
  {
    citationNumber: { type: Number, required: true, min: 1 },
    documentId: { type: ObjectId, ref: "Document", required: true },
    documentTitle: { type: String, required: true },
    fileType: { type: String, default: null },
    folderName: { type: String, default: null },
    chunkId: { type: ObjectId, ref: "DocumentChunk", default: null },
    sectionTitle: { type: String, default: null },
    pageNumber: { type: Number, default: null, min: 1 },
    slideNumber: { type: Number, default: null, min: 1 },
    sheetName: { type: String, default: null },
    rowRange: { type: String, default: null },
    mediaTimestamp: { type: String, default: null },
    excerptPreview: { type: String, default: null },
    similarityScore: { type: Number, default: null },
    usedFor: { type: String, default: null },
  },
  { _id: false },
);

const aiMetaSchema = new mongoose.Schema(
  {
    actionType: { type: String, enum: AI_MESSAGE_ACTION_TYPES, default: null },
    generationModel: { type: String, default: null },
    fallbackUsed: { type: Boolean, default: false },
    fallbackLevel: { type: Number, default: 0, min: 0 },
    keySlotUsed: { type: Number, default: null, min: 0 },
    estimatedInputTokens: { type: Number, default: 0, min: 0 },
    estimatedOutputTokens: { type: Number, default: 0, min: 0 },
    latencyMs: { type: Number, default: null, min: 0 },
  },
  { _id: false },
);

const chatMessageSchema = new mongoose.Schema(
  {
    chatSessionId: {
      type: ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    demoSessionId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: CHAT_ROLES,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: CHAT_MESSAGE_STATUSES,
      default: CHAT_MESSAGE_STATUS.PENDING,
      required: true,
    },
    attachedDocumentSnapshot: [attachedDocumentSnapshotSchema],
    attachedFolderSnapshot: [attachedFolderSnapshotSchema],
    resolvedDocumentSnapshot: [resolvedDocumentSnapshotSchema],
    referencesUsed: [referenceUsedSchema],
    aiMeta: {
      type: aiMetaSchema,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

chatMessageSchema.index({ chatSessionId: 1, createdAt: 1 });
chatMessageSchema.index({ demoSessionId: 1, createdAt: 1 });
chatMessageSchema.index({ role: 1 });

export const ChatMessage =
  mongoose.models.ChatMessage || mongoose.model("ChatMessage", chatMessageSchema);
