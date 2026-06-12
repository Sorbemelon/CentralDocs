import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const requiredKeys = [
  "NODE_ENV",
  "PORT",
  "CLIENT_ORIGINS",
  "DEMO_CLEAR_RESETS_USAGE",
  "DEMO_QUOTA_WINDOW_DAYS",
  "MONGODB_URI",
  "MONGODB_DATABASE_NAME",
  "MONGODB_VECTOR_INDEX_NAME",
  "MONGODB_VECTOR_PATH",
  "AWS_REGION",
  "AWS_S3_BUCKET",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AI_PROVIDER",
  "GEMINI_EMBEDDING_MODEL",
  "GEMINI_EMBEDDING_DIMENSIONS",
  "GEMINI_GENERATION_PRIMARY_MODEL",
  "GEMINI_GENERATION_FALLBACK_MODEL_1",
  "GEMINI_GENERATION_FALLBACK_MODEL_2",
  "GEMINI_API_KEY_1",
  "GEMINI_API_KEY_2",
  "GEMINI_API_KEY_3",
];

test("backend env example includes deployment placeholders without real secrets", async () => {
  const text = await fs.readFile(path.resolve(".env.example"), "utf8");
  const values = new Map();

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }
    const [key, ...rest] = line.split("=");
    values.set(key, rest.join("="));
  }

  for (const key of requiredKeys) {
    assert.ok(values.has(key), `${key} is missing from .env.example`);
  }

  for (const key of ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "GEMINI_API_KEY_1"]) {
    assert.equal(values.get(key), "<replace-me>");
  }
  assert.match(values.get("CLIENT_ORIGINS"), /localhost:5173/);
  assert.equal(values.get("DEMO_CLEAR_RESETS_USAGE"), "false");
  assert.equal(values.get("DEMO_QUOTA_WINDOW_DAYS"), "3");
  assert.match(values.get("MONGODB_URI"), /\/centraldocs\?/);
  assert.equal(values.get("MONGODB_DATABASE_NAME"), "centraldocs");
  assert.equal(values.get("AI_PROVIDER"), "gemini");
  assert.equal(values.get("GEMINI_EMBEDDING_MODEL"), "gemini-embedding-2");
  assert.equal(values.get("GEMINI_EMBEDDING_DIMENSIONS"), "768");
  assert.equal(values.get("MONGODB_VECTOR_INDEX_NAME"), "document_chunks_vector_index");
  assert.equal(values.get("MONGODB_VECTOR_PATH"), "embedding");
  assert.match(text, /Without \/centraldocs/);
  assert.match(text, /without resetting usage/i);
  assert.equal(text.includes("-----BEGIN"), false);
  assert.equal(text.includes("sk-"), false);
  assert.equal(text.includes("AIza"), false);
});
