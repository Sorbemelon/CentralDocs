import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb+srv://example.invalid/centraldocs";
process.env.AWS_REGION = "ap-southeast-1";
process.env.AWS_S3_BUCKET = "centraldocs-test-bucket";
process.env.AWS_ACCESS_KEY_ID = "health-no-gemini-access-token";
process.env.AWS_SECRET_ACCESS_KEY = "health-no-gemini-sensitive-token";
process.env.AI_PROVIDER = "gemini";
process.env.GEMINI_EMBEDDING_MODEL = "gemini-embedding-2";
process.env.GEMINI_EMBEDDING_DIMENSIONS = "768";
process.env.GEMINI_GENERATION_PRIMARY_MODEL = "gemini-3.5-flash";
process.env.GEMINI_GENERATION_FALLBACK_MODEL_1 = "gemini-3-flash-preview";
process.env.GEMINI_GENERATION_FALLBACK_MODEL_2 = "gemini-2.5-flash";
process.env.MONGODB_VECTOR_INDEX_NAME = "document_chunks_vector_index";
process.env.MONGODB_VECTOR_PATH = "embedding";
process.env.GEMINI_API_KEY_1 = "";
process.env.GEMINI_API_KEY_2 = "";
process.env.GEMINI_API_KEY_3 = "";
process.env.GEMINI_API_KEYS = "";

const { app } = await import("../src/app.js");

test("GET /api/health/dependencies reports missing Gemini keys clearly and safely", async () => {
  const response = await request(app).get("/api/health/dependencies").expect(200);
  const body = JSON.stringify(response.body);

  assert.equal(response.body.dependencies.gemini, "not_configured");
  assert.equal(response.body.dependencies.ai.configured, false);
  assert.equal(response.body.dependencies.ai.keyCount, 0);
  assert.deepEqual(response.body.dependencies.ai.liveRuntime, {
    enabled: false,
    reason: "missing_api_key",
  });
  assert.equal(response.body.dependencies.ai.embedding.configured, false);
  assert.equal(response.body.dependencies.ai.generation.configured, false);
  assert.equal(body.includes("health-no-gemini-access-token"), false);
  assert.equal(body.includes("health-no-gemini-sensitive-token"), false);
  assert.equal(body.includes("mongodb+srv://example.invalid"), false);
});
