import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb+srv://db_user:db_password@hidden-host.example/?appName=CentralDocsCluster";
process.env.MONGODB_DATABASE_NAME = "centraldocs";
process.env.MONGODB_VECTOR_INDEX_NAME = "custom_chunks_vector_index";
process.env.MONGODB_VECTOR_PATH = "embedding.values";
process.env.AI_PROVIDER = "gemini";
process.env.GEMINI_EMBEDDING_MODEL = "custom-embedding-model";
process.env.GEMINI_EMBEDDING_DIMENSIONS = "384";
process.env.GEMINI_GENERATION_PRIMARY_MODEL = "custom-generation-primary";
process.env.GEMINI_GENERATION_FALLBACK_MODEL_1 = "custom-generation-fallback-a";
process.env.GEMINI_GENERATION_FALLBACK_MODEL_2 = "custom-generation-fallback-b";

const {
  env,
  getMongoConnectionOptions,
  getMongoDatabaseWarning,
  getSafeConfigSummary,
} = await import("../src/config/env.js");
const { AI_MODELS, GENERATION_MODEL_LANE } = await import("../src/config/aiModels.js");
const { getGenerationModelLane } = await import("../src/services/ai/generationModelLane.service.js");
const { getEmbeddingServiceStatus, embedText } = await import("../src/services/ai/geminiEmbedding.service.js");
const { validateEmbeddingVector } = await import("../src/services/embedding/embeddingVector.service.js");
const { buildVectorSearchPipeline } = await import("../src/services/search/vectorSearchPipeline.service.js");
const { getDocumentChunkVectorSearchMetadata } = await import("../src/services/indexing/documentChunk.repository.js");

function fakeVector(value = 0.1) {
  return Array.from({ length: 384 }, () => value);
}

test("custom env model and vector settings are read safely", () => {
  const summary = getSafeConfigSummary();
  const serialized = JSON.stringify(summary);

  assert.equal(env.aiProvider, "gemini");
  assert.equal(AI_MODELS.embedding.model, "custom-embedding-model");
  assert.equal(AI_MODELS.embedding.dimensions, 384);
  assert.equal(AI_MODELS.generation.primary, "custom-generation-primary");
  assert.deepEqual(AI_MODELS.generation.fallbacks, [
    "custom-generation-fallback-a",
    "custom-generation-fallback-b",
  ]);
  assert.deepEqual(GENERATION_MODEL_LANE, [
    "custom-generation-primary",
    "custom-generation-fallback-a",
    "custom-generation-fallback-b",
  ]);
  assert.deepEqual(summary.vectorSearch, {
    indexName: "custom_chunks_vector_index",
    path: "embedding.values",
  });
  assert.equal(serialized.includes("db_password"), false);
  assert.equal(serialized.includes("hidden-host.example"), false);
});

test("MongoDB database-name fallback is explicit and secret-safe", () => {
  const warning = getMongoDatabaseWarning();

  assert.deepEqual(getMongoConnectionOptions(), { dbName: "centraldocs" });
  assert.match(warning, /MONGODB_DATABASE_NAME/);
  assert.equal(warning.includes("db_password"), false);
  assert.equal(warning.includes("hidden-host.example"), false);
});

test("generation lane uses configured primary and fallbacks", () => {
  const lane = getGenerationModelLane();

  assert.equal(lane.primary, "custom-generation-primary");
  assert.deepEqual(lane.fallbacks, [
    "custom-generation-fallback-a",
    "custom-generation-fallback-b",
  ]);
  assert.deepEqual(lane.lane, [
    "custom-generation-primary",
    "custom-generation-fallback-a",
    "custom-generation-fallback-b",
  ]);
});

test("embedding service and vector validation use configured dimensions", async () => {
  const status = getEmbeddingServiceStatus();
  let captured = null;
  const client = {
    models: {
      embedContent: async (payload) => {
        captured = payload;
        return { embeddings: [{ values: fakeVector(0.2) }] };
      },
    },
  };

  assert.equal(status.model, "custom-embedding-model");
  assert.equal(status.dimensions, 384);
  assert.equal(validateEmbeddingVector(fakeVector()).length, 384);

  const result = await embedText({ text: "CentralDocs custom embedding config", client });
  assert.equal(captured.model, "custom-embedding-model");
  assert.equal(captured.config.outputDimensionality, 384);
  assert.equal(result.model, "custom-embedding-model");
  assert.equal(result.dimensions, 384);
});

test("vector search pipeline and metadata use configured index and path", () => {
  const pipeline = buildVectorSearchPipeline({
    queryVector: fakeVector(),
    topK: 3,
    allowedScopes: ["mock"],
    resolvedDocumentIds: ["mock_doc"],
  });
  const metadata = getDocumentChunkVectorSearchMetadata();

  assert.equal(pipeline[0].$vectorSearch.index, "custom_chunks_vector_index");
  assert.equal(pipeline[0].$vectorSearch.path, "embedding.values");
  assert.equal(metadata.indexName, "custom_chunks_vector_index");
  assert.equal(metadata.vectorField, "embedding.values");
  assert.equal(metadata.dimensions, 384);
  assert.equal(metadata.model, "custom-embedding-model");
});
