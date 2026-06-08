import dotenv from "dotenv";
import { z } from "zod";
import { AI_MODELS, GENERATION_MODEL_LANE } from "./aiModels.js";

dotenv.config({ quiet: true });

const DEFAULT_CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  CLIENT_ORIGINS: z.string().optional(),
  MONGODB_URI: z.string().trim().optional(),
  AWS_REGION: z.string().trim().optional(),
  AWS_S3_BUCKET: z.string().trim().optional(),
  AWS_ACCESS_KEY_ID: z.string().trim().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().trim().optional(),
  GEMINI_API_KEY_1: z.string().trim().optional(),
  GEMINI_API_KEY_2: z.string().trim().optional(),
  GEMINI_API_KEY_3: z.string().trim().optional(),
  GEMINI_API_KEYS: z.string().trim().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  throw new Error(`Invalid backend environment configuration: ${JSON.stringify(issues)}`);
}

const rawEnv = parsed.data;

function parseOrigins(value) {
  if (!value) {
    return DEFAULT_CLIENT_ORIGINS;
  }

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : DEFAULT_CLIENT_ORIGINS;
}

function collectGeminiKeys() {
  const explicitKeys = [
    rawEnv.GEMINI_API_KEY_1,
    rawEnv.GEMINI_API_KEY_2,
    rawEnv.GEMINI_API_KEY_3,
  ];

  const combinedKeys = rawEnv.GEMINI_API_KEYS
    ? rawEnv.GEMINI_API_KEYS.split(",").map((key) => key.trim())
    : [];

  return [...explicitKeys, ...combinedKeys].filter(Boolean);
}

const geminiApiKeys = collectGeminiKeys();

export const env = Object.freeze({
  NODE_ENV: rawEnv.NODE_ENV,
  PORT: rawEnv.PORT,
  CLIENT_ORIGINS: parseOrigins(rawEnv.CLIENT_ORIGINS),
  isMongoConfigured: Boolean(rawEnv.MONGODB_URI),
  isS3Configured: Boolean(
    rawEnv.AWS_REGION &&
      rawEnv.AWS_S3_BUCKET &&
      rawEnv.AWS_ACCESS_KEY_ID &&
      rawEnv.AWS_SECRET_ACCESS_KEY,
  ),
  s3Presence: Object.freeze({
    region: Boolean(rawEnv.AWS_REGION),
    bucket: Boolean(rawEnv.AWS_S3_BUCKET),
    accessKeyId: Boolean(rawEnv.AWS_ACCESS_KEY_ID),
    secretAccessKey: Boolean(rawEnv.AWS_SECRET_ACCESS_KEY),
  }),
  geminiKeyCount: geminiApiKeys.length,
  generationModelLane: GENERATION_MODEL_LANE,
  embeddingModel: AI_MODELS.embedding.model,
  embeddingDimensions: AI_MODELS.embedding.dimensions,
});

export function getMongoUri() {
  return rawEnv.MONGODB_URI || null;
}

export function getS3Config() {
  if (!env.isS3Configured) {
    return null;
  }

  return {
    region: rawEnv.AWS_REGION,
    bucket: rawEnv.AWS_S3_BUCKET,
    credentials: {
      accessKeyId: rawEnv.AWS_ACCESS_KEY_ID,
      secretAccessKey: rawEnv.AWS_SECRET_ACCESS_KEY,
    },
  };
}

export function getGeminiApiKeys() {
  return [...geminiApiKeys];
}

export function getSafeConfigSummary() {
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    clientOrigins: env.CLIENT_ORIGINS,
    mongodb: env.isMongoConfigured ? "configured" : "not_configured",
    s3: env.isS3Configured ? "configured" : "not_configured",
    s3Presence: env.s3Presence,
    geminiKeyCount: env.geminiKeyCount,
    generationModelLane: env.generationModelLane,
    embeddingModel: env.embeddingModel,
    embeddingDimensions: env.embeddingDimensions,
  };
}
