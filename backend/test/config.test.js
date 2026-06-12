import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb+srv://hidden-host.example/centraldocs";
process.env.AWS_REGION = "ap-southeast-1";
process.env.AWS_S3_BUCKET = "safe-summary-bucket";
process.env.AWS_ACCESS_KEY_ID = "safe-summary-access-token";
process.env.AWS_SECRET_ACCESS_KEY = "safe-summary-sensitive-token";
process.env.AI_PROVIDER = "gemini";
process.env.GEMINI_EMBEDDING_MODEL = "gemini-embedding-2";
process.env.GEMINI_EMBEDDING_DIMENSIONS = "768";
process.env.GEMINI_GENERATION_PRIMARY_MODEL = "gemini-3.5-flash";
process.env.GEMINI_GENERATION_FALLBACK_MODEL_1 = "gemini-3-flash-preview";
process.env.GEMINI_GENERATION_FALLBACK_MODEL_2 = "gemini-2.5-flash";
process.env.MONGODB_VECTOR_INDEX_NAME = "document_chunks_vector_index";
process.env.MONGODB_VECTOR_PATH = "embedding";
process.env.GEMINI_API_KEY_1 = "safe-summary-gemini-token";
process.env.GEMINI_API_KEY_2 = "";
process.env.GEMINI_API_KEY_3 = "";
process.env.GEMINI_API_KEYS = "";

const { DEMO_LIMITS } = await import("../src/config/limits.js");
const {
  env,
  getEmbeddingDimensions,
  getEmbeddingModel,
  getGenerationFallbackModels,
  getGenerationPrimaryModel,
  getMongoDatabaseWarning,
  getSafeConfigSummary,
  getVectorIndexName,
  getVectorPath,
} = await import("../src/config/env.js");

test("demo limits match locked CentralDocs decisions", () => {
  assert.equal(DEMO_LIMITS.sessionLifetimeDays, 3);
  assert.equal(DEMO_LIMITS.maxUploadedFiles, 5);
  assert.equal(DEMO_LIMITS.maxChatSessions, 5);
  assert.equal(DEMO_LIMITS.maxAiPrompts, 10);
  assert.equal(DEMO_LIMITS.maxGeneratedDocuments, 3);
  assert.equal(DEMO_LIMITS.maxUserFolders, 10);
  assert.equal(DEMO_LIMITS.maxStorageBytes, 20 * 1024 * 1024);
  assert.equal(DEMO_LIMITS.maxGeneratedDocumentBytes, 100 * 1024);
  assert.equal(DEMO_LIMITS.maxPromptLengthChars, 1500);
  assert.equal(DEMO_LIMITS.maxGenerateDocumentInstructionLengthChars, 2000);
  assert.equal(DEMO_LIMITS.maxSemanticSearchQueryLengthChars, 500);
  assert.equal(DEMO_LIMITS.topKRetrieval, 15);
  assert.equal(DEMO_LIMITS.visibleReferences, 10);
  assert.equal(DEMO_LIMITS.recentChatHistoryMessages, 8);
});

test("safe config summary does not expose sensitive values", () => {
  const summary = getSafeConfigSummary();
  const serialized = JSON.stringify(summary);

  assert.equal(env.NODE_ENV, "test");
  assert.equal(summary.mongodb, "configured");
  assert.equal(summary.mongodbDatabaseConfigured, true);
  assert.equal(summary.mongodbDatabaseWarning, null);
  assert.deepEqual(summary.s3, {
    configured: true,
    regionConfigured: true,
    bucketConfigured: true,
    credentialsConfigured: true,
  });
  assert.equal(summary.aiProvider, "gemini");
  assert.equal(summary.geminiKeyCount, 1);
  assert.deepEqual(summary.ai, {
    provider: "gemini",
    configured: true,
    keyCount: 1,
    embedding: {
      model: "gemini-embedding-2",
      dimensions: 768,
      configured: true,
    },
    generation: {
      primaryModel: "gemini-3.5-flash",
      fallbackModels: [
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
      ],
      configured: true,
    },
    liveRuntime: {
      enabled: true,
      reason: "configured",
    },
  });
  assert.deepEqual(summary.generationModelLane, [
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
  ]);
  assert.equal(summary.embeddingModel, "gemini-embedding-2");
  assert.equal(summary.embeddingDimensions, 768);
  assert.deepEqual(summary.vectorSearch, {
    indexName: "document_chunks_vector_index",
    path: "embedding",
    dimensions: 768,
  });
  assert.equal(serialized.includes("hidden-host.example"), false);
  assert.equal(serialized.includes("safe-summary-access-token"), false);
  assert.equal(serialized.includes("safe-summary-sensitive-token"), false);
  assert.equal(serialized.includes("safe-summary-gemini-token"), false);
});

test("default model and vector getters match CentralDocs behavior", () => {
  assert.equal(getEmbeddingModel(), "gemini-embedding-2");
  assert.equal(getEmbeddingDimensions(), 768);
  assert.equal(getGenerationPrimaryModel(), "gemini-3.5-flash");
  assert.deepEqual(getGenerationFallbackModels(), [
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
  ]);
  assert.equal(getVectorIndexName(), "document_chunks_vector_index");
  assert.equal(getVectorPath(), "embedding");
  assert.equal(getMongoDatabaseWarning(), null);
});

test("MongoDB URI without database path produces safe warning", async () => {
  const previousUri = process.env.MONGODB_URI;
  const previousDatabaseName = process.env.MONGODB_DATABASE_NAME;
  process.env.MONGODB_URI = "mongodb+srv://db_user:db_password@hidden-host.example/?appName=CentralDocsCluster";
  process.env.MONGODB_DATABASE_NAME = "";

  const module = await import(`../src/config/env.js?mongodb-warning=${Date.now()}`);
  const warning = module.getMongoDatabaseWarning();
  const summary = module.getSafeConfigSummary();
  const serialized = JSON.stringify({ warning, summary });

  assert.match(warning, /no database path/i);
  assert.match(warning, /\/centraldocs/);
  assert.equal(summary.mongodbDatabaseConfigured, false);
  assert.equal(serialized.includes("db_password"), false);
  assert.equal(serialized.includes("hidden-host.example"), false);

  process.env.MONGODB_URI = previousUri;
  process.env.MONGODB_DATABASE_NAME = previousDatabaseName ?? "";
});

test("invalid embedding dimensions fail environment validation", async () => {
  const previousDimensions = process.env.GEMINI_EMBEDDING_DIMENSIONS;
  process.env.GEMINI_EMBEDDING_DIMENSIONS = "0";

  await assert.rejects(
    () => import(`../src/config/env.js?invalid-dimensions=${Date.now()}`),
    /Invalid backend environment configuration/,
  );

  process.env.GEMINI_EMBEDDING_DIMENSIONS = previousDimensions ?? "";
});
