import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const DEFAULT_CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export const DEFAULT_AI_PROVIDER = "gemini";
export const DEFAULT_GEMINI_EMBEDDING_MODEL = "gemini-embedding-2";
export const DEFAULT_GEMINI_EMBEDDING_DIMENSIONS = 768;
export const DEFAULT_GEMINI_GENERATION_PRIMARY_MODEL = "gemini-3.5-flash";
export const DEFAULT_GEMINI_GENERATION_FALLBACK_MODELS = Object.freeze([
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
]);
export const DEFAULT_MONGODB_VECTOR_INDEX_NAME = "document_chunks_vector_index";
export const DEFAULT_MONGODB_VECTOR_PATH = "embedding";

const emptyToUndefined = (value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
};

const optionalTrimmedString = () => z.preprocess(
  emptyToUndefined,
  z.string().trim().optional(),
);

const defaultedTrimmedString = (defaultValue) => z.preprocess(
  emptyToUndefined,
  z.string().trim().default(defaultValue),
);

const safeMongoDatabaseName = z.preprocess(
  emptyToUndefined,
  z.string()
    .trim()
    .regex(/^[^/\\.$"*\s<>:|?]+$/, "MongoDB database name contains unsupported characters.")
    .optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  CLIENT_ORIGINS: optionalTrimmedString(),
  MONGODB_URI: optionalTrimmedString(),
  MONGODB_DATABASE_NAME: safeMongoDatabaseName,
  MONGODB_VECTOR_INDEX_NAME: defaultedTrimmedString(DEFAULT_MONGODB_VECTOR_INDEX_NAME)
    .pipe(z.string().regex(/^[A-Za-z0-9_-]+$/, "MongoDB vector index name must be a safe identifier.")),
  MONGODB_VECTOR_PATH: defaultedTrimmedString(DEFAULT_MONGODB_VECTOR_PATH)
    .pipe(z.string().regex(/^[A-Za-z0-9_.]+$/, "MongoDB vector path must be a safe dot path.")),
  AI_PROVIDER: defaultedTrimmedString(DEFAULT_AI_PROVIDER).pipe(z.enum(["gemini"])),
  GEMINI_EMBEDDING_MODEL: defaultedTrimmedString(DEFAULT_GEMINI_EMBEDDING_MODEL),
  GEMINI_EMBEDDING_DIMENSIONS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(DEFAULT_GEMINI_EMBEDDING_DIMENSIONS),
  ),
  GEMINI_GENERATION_PRIMARY_MODEL: defaultedTrimmedString(DEFAULT_GEMINI_GENERATION_PRIMARY_MODEL),
  GEMINI_GENERATION_FALLBACK_MODEL_1: defaultedTrimmedString(DEFAULT_GEMINI_GENERATION_FALLBACK_MODELS[0]),
  GEMINI_GENERATION_FALLBACK_MODEL_2: defaultedTrimmedString(DEFAULT_GEMINI_GENERATION_FALLBACK_MODELS[1]),
  AWS_REGION: optionalTrimmedString(),
  AWS_S3_BUCKET: optionalTrimmedString(),
  AWS_ACCESS_KEY_ID: optionalTrimmedString(),
  AWS_SECRET_ACCESS_KEY: optionalTrimmedString(),
  GEMINI_API_KEY_1: optionalTrimmedString(),
  GEMINI_API_KEY_2: optionalTrimmedString(),
  GEMINI_API_KEY_3: optionalTrimmedString(),
  GEMINI_API_KEYS: optionalTrimmedString(),
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
const generationFallbackModels = [
  rawEnv.GEMINI_GENERATION_FALLBACK_MODEL_1,
  rawEnv.GEMINI_GENERATION_FALLBACK_MODEL_2,
].filter(Boolean);
const generationModelLane = [
  rawEnv.GEMINI_GENERATION_PRIMARY_MODEL,
  ...generationFallbackModels,
].filter(Boolean);

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

function getMongoDatabasePathFromUri(uri) {
  if (!uri) {
    return null;
  }

  try {
    const parsedUri = new URL(uri);
    const databasePath = decodeURIComponent((parsedUri.pathname || "").replace(/^\/+/, ""));
    return databasePath || null;
  } catch {
    return null;
  }
}

const mongoDatabasePath = getMongoDatabasePathFromUri(rawEnv.MONGODB_URI);

export const env = Object.freeze({
  NODE_ENV: rawEnv.NODE_ENV,
  PORT: rawEnv.PORT,
  CLIENT_ORIGINS: parseOrigins(rawEnv.CLIENT_ORIGINS),
  isMongoConfigured: Boolean(rawEnv.MONGODB_URI),
  mongoDatabaseName: mongoDatabasePath || rawEnv.MONGODB_DATABASE_NAME || null,
  isS3Configured: Boolean(
    rawEnv.AWS_REGION &&
      rawEnv.AWS_S3_BUCKET &&
      rawEnv.AWS_ACCESS_KEY_ID &&
      rawEnv.AWS_SECRET_ACCESS_KEY,
  ),
  s3Presence: Object.freeze({
    configured: Boolean(
      rawEnv.AWS_REGION &&
        rawEnv.AWS_S3_BUCKET &&
        rawEnv.AWS_ACCESS_KEY_ID &&
        rawEnv.AWS_SECRET_ACCESS_KEY,
    ),
    regionConfigured: Boolean(rawEnv.AWS_REGION),
    bucketConfigured: Boolean(rawEnv.AWS_S3_BUCKET),
    credentialsConfigured: Boolean(rawEnv.AWS_ACCESS_KEY_ID && rawEnv.AWS_SECRET_ACCESS_KEY),
  }),
  geminiKeyCount: geminiApiKeys.length,
  aiProvider: rawEnv.AI_PROVIDER,
  generationModelLane,
  embeddingModel: rawEnv.GEMINI_EMBEDDING_MODEL,
  embeddingDimensions: rawEnv.GEMINI_EMBEDDING_DIMENSIONS,
  vectorIndexName: rawEnv.MONGODB_VECTOR_INDEX_NAME,
  vectorPath: rawEnv.MONGODB_VECTOR_PATH,
});

export function getMongoUri() {
  return rawEnv.MONGODB_URI || null;
}

export function getMongoDatabaseName() {
  return env.mongoDatabaseName;
}

export function getMongoConnectionOptions() {
  if (mongoDatabasePath || !rawEnv.MONGODB_DATABASE_NAME) {
    return {};
  }

  return { dbName: rawEnv.MONGODB_DATABASE_NAME };
}

export function getMongoDatabaseWarning() {
  if (!rawEnv.MONGODB_URI || mongoDatabasePath) {
    return null;
  }

  if (rawEnv.MONGODB_DATABASE_NAME) {
    return "MONGODB_URI has no database path; using MONGODB_DATABASE_NAME as a fallback. Prefer adding /centraldocs before query parameters.";
  }

  return "MONGODB_URI has no database path; add /centraldocs before query parameters to avoid using the default database.";
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

export function getAiProvider() {
  return rawEnv.AI_PROVIDER;
}

export function getEmbeddingModel() {
  return rawEnv.GEMINI_EMBEDDING_MODEL;
}

export function getEmbeddingDimensions() {
  return rawEnv.GEMINI_EMBEDDING_DIMENSIONS;
}

export function getGenerationPrimaryModel() {
  return rawEnv.GEMINI_GENERATION_PRIMARY_MODEL;
}

export function getGenerationFallbackModels() {
  return [...generationFallbackModels];
}

export function getVectorIndexName() {
  return rawEnv.MONGODB_VECTOR_INDEX_NAME;
}

export function getVectorPath() {
  return rawEnv.MONGODB_VECTOR_PATH;
}

export function getSafeConfigSummary() {
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    clientOrigins: env.CLIENT_ORIGINS,
    mongodb: env.isMongoConfigured ? "configured" : "not_configured",
    mongodbDatabaseConfigured: Boolean(env.mongoDatabaseName),
    mongodbDatabaseWarning: getMongoDatabaseWarning(),
    s3: env.s3Presence,
    aiProvider: rawEnv.AI_PROVIDER,
    geminiKeyCount: env.geminiKeyCount,
    generationModelLane: env.generationModelLane,
    embeddingModel: env.embeddingModel,
    embeddingDimensions: env.embeddingDimensions,
    vectorSearch: {
      indexName: env.vectorIndexName,
      path: env.vectorPath,
    },
  };
}
