import mongoose from "mongoose";
import { FOLDER_SCOPES, FOLDER_SCOPE } from "../constants/document.constants.js";
import { LIFECYCLE_STATUS, LIFECYCLE_STATUSES } from "../constants/lifecycle.constants.js";

const { ObjectId } = mongoose.Schema.Types;

const folderSchema = new mongoose.Schema(
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
    scope: {
      type: String,
      enum: FOLDER_SCOPES,
      required: true,
      default: FOLDER_SCOPE.USER,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    parentFolderId: {
      type: ObjectId,
      ref: "Folder",
      default: null,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
    documentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifecycleStatus: {
      type: String,
      enum: LIFECYCLE_STATUSES,
      default: LIFECYCLE_STATUS.ACTIVE,
      required: true,
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
    restoreParentFolderId: {
      type: ObjectId,
      ref: "Folder",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

folderSchema.index({ demoSessionId: 1, lifecycleStatus: 1 });
folderSchema.index({ scope: 1, lifecycleStatus: 1 });
folderSchema.index({ parentFolderId: 1 });
folderSchema.index({ path: 1 });
folderSchema.index({ mockId: 1, scope: 1 }, { unique: true, sparse: true });

folderSchema.path("demoSessionId").validate(function validateUserFolderSession(value) {
  return this.scope !== FOLDER_SCOPE.USER || Boolean(value);
}, "User folders must belong to a demo session.");

folderSchema.pre("validate", function applyFolderConventions() {
  if (this.scope === FOLDER_SCOPE.MOCK) {
    this.readOnly = true;
  }
});

export const Folder = mongoose.models.Folder || mongoose.model("Folder", folderSchema);
