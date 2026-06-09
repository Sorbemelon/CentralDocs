import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb+srv://example.invalid/centraldocs";
process.env.AWS_REGION = "ap-southeast-1";
process.env.AWS_S3_BUCKET = "centraldocs-test-bucket";
process.env.AWS_ACCESS_KEY_ID = "health-test-access-token";
process.env.AWS_SECRET_ACCESS_KEY = "health-test-sensitive-token";
process.env.GEMINI_API_KEY_1 = "health-test-gemini-token";

const { app } = await import("../src/app.js");

function responseText(response) {
  return JSON.stringify(response.body);
}

test("GET /api/health returns service metadata", async () => {
  const response = await request(app).get("/api/health").expect(200);

  assert.equal(response.body.status, "ok");
  assert.equal(response.body.service, "centraldocs-backend");
  assert.equal(response.body.version, "0.1.0");
  assert.equal(response.body.environment, "test");
  assert.match(response.body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test("GET /api/health/warm returns awake status", async () => {
  const response = await request(app).get("/api/health/warm").expect(200);

  assert.equal(response.body.status, "awake");
  assert.match(response.body.message, /awake/i);
  assert.match(response.body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test("GET /api/health/dependencies returns safe dependency statuses", async () => {
  const response = await request(app).get("/api/health/dependencies").expect(200);

  assert.equal(response.body.status, "ok");
  assert.match(response.body.dependencies.mongodb, /configured|connected|not_configured|disconnected/);
  assert.deepEqual(response.body.dependencies.s3, {
    configured: true,
    regionConfigured: true,
    bucketConfigured: true,
    credentialsConfigured: true,
  });
  assert.match(response.body.dependencies.gemini, /configured|not_configured/);
  assert.equal(response.body.config.geminiKeyCount, 1);
  assert.deepEqual(response.body.config.s3, {
    configured: true,
    regionConfigured: true,
    bucketConfigured: true,
    credentialsConfigured: true,
  });

  const body = responseText(response);
  assert.equal(body.includes("health-test-access-token"), false);
  assert.equal(body.includes("health-test-sensitive-token"), false);
  assert.equal(body.includes("health-test-gemini-token"), false);
  assert.equal(body.includes("mongodb+srv://example.invalid"), false);
});
