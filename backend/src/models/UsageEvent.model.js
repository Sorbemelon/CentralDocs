import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const usageEventSchema = new mongoose.Schema(
  {
    demoSessionId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
    resourceType: {
      type: String,
      required: true,
      trim: true,
    },
    resourceId: {
      type: ObjectId,
      default: null,
    },
    countDelta: {
      type: Number,
      default: 0,
    },
    storageDelta: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

usageEventSchema.index({ demoSessionId: 1, createdAt: 1 });
usageEventSchema.index({ eventType: 1 });

export const UsageEvent =
  mongoose.models.UsageEvent || mongoose.model("UsageEvent", usageEventSchema);
