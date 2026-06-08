import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
delete process.env.MONGODB_URI;

const { app } = await import("../src/app.js");

test("GET /api/trash returns empty trash when MongoDB is not configured", async () => {
  const response = await request(app).get("/api/trash").expect(200);

  assert.equal(response.body.status, "ready");
  assert.equal(response.body.persistenceStatus, "not_configured");
  assert.deepEqual(response.body.folders, []);
  assert.deepEqual(response.body.documents, []);
  assert.deepEqual(response.body.counts, {
    folders: 0,
    documents: 0,
    total: 0,
  });
});
