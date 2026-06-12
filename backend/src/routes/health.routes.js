import { Router } from "express";
import { env, getDemoIpQuotaConfigSummary, getSafeConfigSummary } from "../config/env.js";
import { getMongoStatus } from "../db/connectMongo.js";
import { getAiDependencyStatus, getAiModelLane, getGeminiStatus } from "../services/ai/aiModelLane.js";
import { getStorageStatus } from "../services/storage/s3Storage.service.js";
import { nowIso } from "../utils/time.js";

export const healthRouter = Router();

const SERVICE_NAME = "centraldocs-backend";
const SERVICE_VERSION = "0.1.0";

healthRouter.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    timestamp: nowIso(),
    environment: env.NODE_ENV,
  });
});

healthRouter.get("/warm", (req, res) => {
  res.json({
    status: "awake",
    message: "CentralDocs backend is awake and ready for the demo bootstrap.",
    timestamp: nowIso(),
  });
});

healthRouter.get("/dependencies", (req, res) => {
  res.json({
    status: "ok",
    timestamp: nowIso(),
    dependencies: {
      mongodb: getMongoStatus(),
      s3: getStorageStatus(),
      gemini: getGeminiStatus(),
      ai: getAiDependencyStatus(),
      vectorSearch: {
        indexName: env.vectorIndexName,
        path: env.vectorPath,
        dimensions: env.embeddingDimensions,
      },
      ipQuota: getDemoIpQuotaConfigSummary(),
    },
    config: getSafeConfigSummary(),
    aiModelLane: getAiModelLane(),
  });
});
