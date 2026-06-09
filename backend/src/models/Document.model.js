import mongoose from "mongoose";
import {
  DOCUMENT_SCOPE,
  DOCUMENT_SCOPES,
  DOCUMENT_STATUS,
  DOCUMENT_STATUSES,
  FILE_KINDS,
  SOURCE_TYPE,
  SOURCE_TYPES,
  STORAGE_PROVIDER,
  STORAGE_PROVIDERS,
} from "../constants/document.constants.js";
import { LIFECYCLE_STATUS, LIFECYCLE_STATUSES } from "../constants/lifecycle.constants.js";

const { ObjectId } = mongoose.Schema.Types;

const contentStatsSchema = new mongoose.Schema(
  {
    extractedCharCount: { type: Number, default: 0, min: 0 },
    optimizedCharCount: { type: Number, default: 0, min: 0 },
    estimatedTokenCount: { type: Number, default: 0, min: 0 },
    chunkCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const generatedMetaSchema = new mongoose.Schema(
  {
    fromChatSessionId: { type: ObjectId, ref: "ChatSession", default: null },
    generationInstruction: { type: String, default: null },
    sourceMessageIds: [{ type: ObjectId, ref: "ChatMessage" }],
    sourceDocumentIds: [{ type: String }],
    referencesIncluded: { type: Boolean, default: false },
  },
  { _id: false },
);

const mediaMetaSchema = new mongoose.Schema(
  {
    directMultimodalEmbeddingSeeded: { type: Boolean, default: false },
    directMultimodalEmbeddedAt: { type: Date, default: null },
    directMultimodalChunkId: { type: ObjectId, ref: "DocumentChunk", default: null },
    directMultimodalEmbeddingModel: { type: String, default: null },
    directMultimodalEmbeddingDimensions: { type: Number, default: null, min: 0 },
    transcriptDocumentId: { type: ObjectId, ref: "Document", default: null },
    durationSeconds: { type: Number, default: null, min: 0 },
  },
  { _id: false },
);

const documentSchema = new mongoose.Schema(
  {
    demoSessionId: {
      type: String,
      default: null,
      index: true,
    },
    mockId: {
      type: String,
      default: null,
      index: true,
    },
    manifestPath: {
      type: String,
      default: null,
      trim: true,
    },
    folderId: {
      type: ObjectId,
      ref: "Folder",
      default: null,
    },
    scope: {
      type: String,
      enum: DOCUMENT_SCOPES,
      required: true,
      default: DOCUMENT_SCOPE.USER,
    },
    sourceType: {
      type: String,
      enum: SOURCE_TYPES,
      required: true,
      default: SOURCE_TYPE.UPLOAD,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },
    downloadFilename: {
      type: String,
      required: true,
      trim: true,
    },
    fileExtension: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    fileKind: {
      type: String,
      enum: FILE_KINDS,
      required: true,
    },
    storageProvider: {
      type: String,
      enum: STORAGE_PROVIDERS,
      required: true,
      default: STORAGE_PROVIDER.S3,
    },
    objectKey: {
      type: String,
      required: true,
      trim: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 0,
    },
    checksum: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: DOCUMENT_STATUSES,
      required: true,
      default: DOCUMENT_STATUS.UPLOADED,
      index: true,
    },
    statusMessage: {
      type: String,
      default: null,
    },
    extractedTextPreview: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    demoQuestions: {
      type: [String],
      default: undefined,
    },
    contentStats: {
      type: contentStatsSchema,
      default: () => ({}),
    },
    generatedMeta: {
      type: generatedMetaSchema,
      default: null,
    },
    mediaMeta: {
      type: mediaMetaSchema,
      default: null,
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
    lifecycleStatus: {
      type: String,
      enum: LIFECYCLE_STATUSES,
      required: true,
      default: LIFECYCLE_STATUS.ACTIVE,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedByDemoSessionId: {
      type: String,
      default: null,
    },
    deleteOperationId: {
      type: String,
      default: null,
    },
    originalFolderIdBeforeDelete: {
      type: ObjectId,
      ref: "Folder",
      default: null,
    },
    restoreParentFolderId: {
      type: ObjectId,
      ref: "Folder",
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

documentSchema.index({ demoSessionId: 1, lifecycleStatus: 1 });
documentSchema.index({ folderId: 1, lifecycleStatus: 1 });
documentSchema.index({ scope: 1, lifecycleStatus: 1 });
documentSchema.index({ sourceType: 1, lifecycleStatus: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ fileKind: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ mockId: 1, scope: 1 }, { unique: true, sparse: true });

documentSchema.path("demoSessionId").validate(function validateOwnedDocumentSession(value) {
  const sessionOwnedScope =
    this.scope === DOCUMENT_SCOPE.USER || this.scope === DOCUMENT_SCOPE.GENERATED;
  const sessionOwnedSource =
    this.sourceType === SOURCE_TYPE.UPLOAD || this.sourceType === SOURCE_TYPE.GENERATED;

  return !(sessionOwnedScope || sessionOwnedSource) || Boolean(value);
}, "Uploaded or generated documents must belong to a demo session.");

documentSchema.pre("validate", function applyDocumentConventions() {
  if (this.scope === DOCUMENT_SCOPE.MOCK || this.sourceType === SOURCE_TYPE.MOCK) {
    this.readOnly = true;
  }
});

export const Document =
  mongoose.models.Document || mongoose.model("Document", documentSchema);
