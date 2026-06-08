import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const { AI_ACTION_TYPE, AI_ROUTING_STATUS } = await import("../src/constants/ai.constants.js");
const { AiRoutingAttempt } = await import("../src/models/AiRoutingAttempt.model.js");
const { UsageEvent } = await import("../src/models/UsageEvent.model.js");

function hasIndex(schema, expectedFields) {
  return schema.indexes().some(([fields]) => JSON.stringify(fields) === JSON.stringify(expectedFields));
}

test("UsageEvent schema has fields, defaults, and indexes", () => {
  const event = new UsageEvent({
    demoSessionId: "demo_123",
    eventType: "upload_count",
    resourceType: "document",
    resourceId: new mongoose.Types.ObjectId(),
    status: "accepted",
  });

  assert.equal(event.countDelta, 0);
  assert.equal(event.storageDelta, 0);
  assert.equal(event.validateSync(), undefined);
  assert.equal(hasIndex(UsageEvent.schema, { demoSessionId: 1, createdAt: 1 }), true);
  assert.equal(hasIndex(UsageEvent.schema, { eventType: 1 }), true);
});

test("AiRoutingAttempt schema has enums, defaults, and indexes", () => {
  const attempt = new AiRoutingAttempt({
    demoSessionId: "demo_123",
    actionType: AI_ACTION_TYPE.EMBEDDING,
    model: "gemini-embedding-2",
  });

  assert.equal(attempt.status, AI_ROUTING_STATUS.FAILED);
  assert.equal(attempt.keySlot, null);
  assert.equal(attempt.isRateLimit, false);
  assert.equal(attempt.fallbackLevel, 0);
  assert.equal(attempt.validateSync(), undefined);

  assert.equal(hasIndex(AiRoutingAttempt.schema, { demoSessionId: 1, createdAt: 1 }), true);
  assert.equal(hasIndex(AiRoutingAttempt.schema, { actionType: 1 }), true);
  assert.equal(hasIndex(AiRoutingAttempt.schema, { model: 1 }), true);
  assert.equal(hasIndex(AiRoutingAttempt.schema, { isRateLimit: 1 }), true);
});
