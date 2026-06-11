import mongoose from "mongoose";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../constants/ai.constants.js";
import { DOCUMENT_SCOPE, DOCUMENT_SCOPES } from "../constants/document.constants.js";
import { LIFECYCLE_STATUS, LIFECYCLE_STATUSES } from "../constants/lifecycle.constants.js";
import {
  CHUNK_KIND,
  CHUNK_KINDS,
  EMBEDDING_INPUT_TYPE,
  EMBEDDING_INPUT_TYPES,
} from "../constants/mediaEmbedding.constants.js";

const { ObjectId } = mongoose.Schema.Types;

const sourceLocatorSchema = new mongoose.Schema(
  {
    pageNumber: { type: Number, default: null, min: 1 },
    slideNumber: { type: Number, default: null, min: 1 },
    sheetName: { type: String, default: null },
    rowStart: { type: Number, default: null, min: 1 },
    rowEnd: { type: Number, default: null, min: 1 },
    sectionTitle: { type: String, default: null },
    mediaTimestampStart: { type: Number, default: null, min: 0 },
    mediaTimestampEnd: { type: Number, default: null, min: 0 },
  },
  { _id: false },
);

const chunkMediaMetaSchema = new mongoose.Schema(
  {
    directMultimodal: { type: Boolean, default: false },
    seededAt: { type: Date, default: null },
    sourceMimeType: { type: String, default: null },
    sourceFilename: { type: String, default: null },
  },
  { _id: false },
);

const documentChunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    demoSessionId: {
      type: String,
      default: null,
      index: true,
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
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    content: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      default: undefined,
    },
    embeddingModel: {
      type: String,
      required: true,
      default: EMBEDDING_MODEL,
    },
    embeddingDimensions: {
      type: Number,
      required: true,
      default: EMBEDDING_DIMENSIONS,
    },
    tokenEstimate: {
      type: Number,
      default: 0,
      min: 0,
    },
    sourceLocator: {
      type: sourceLocatorSchema,
      default: () => ({}),
    },
    chunkKind: {
      type: String,
      enum: CHUNK_KINDS,
      default: CHUNK_KIND.TEXT,
      index: true,
    },
    embeddingInputType: {
      type: String,
      enum: EMBEDDING_INPUT_TYPES,
      default: EMBEDDING_INPUT_TYPE.TEXT,
      index: true,
    },
    mediaMeta: {
      type: chunkMediaMetaSchema,
      default: null,
    },
    lifecycleStatus: {
      type: String,
      enum: LIFECYCLE_STATUSES,
      required: true,
      default: LIFECYCLE_STATUS.ACTIVE,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

documentChunkSchema.index({ demoSessionId: 1, lifecycleStatus: 1 });
documentChunkSchema.index({ folderId: 1, lifecycleStatus: 1 });
documentChunkSchema.index({ scope: 1, lifecycleStatus: 1 });
documentChunkSchema.index({ chunkIndex: 1 });
documentChunkSchema.index({ documentId: 1, chunkKind: 1, lifecycleStatus: 1 });

documentChunkSchema.statics.getAtlasVectorIndexMetadata = function getAtlasVectorIndexMetadata() {
  return {
    managedByMongoose: false,
    provider: "mongodb_atlas_vector_search",
    vectorField: "embedding",
    dimensions: EMBEDDING_DIMENSIONS,
    similarity: "cosine",
  };
};

export const DocumentChunk =
  mongoose.models.DocumentChunk || mongoose.model("DocumentChunk", documentChunkSchema);
