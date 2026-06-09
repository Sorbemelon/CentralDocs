import { test } from "node:test";
import assert from "node:assert/strict";

const { toGenerationResultDto } = await import("../src/services/ai/generationResult.dto.js");

test("generation result DTO returns safe metadata without prompts or keys", () => {
  const dto = toGenerationResultDto({
    text: "Answer [1]",
    model: "gemini-3.5-flash",
    fallbackUsed: false,
    fallbackLevel: 0,
    keySlot: 1,
    latencyMs: 22,
    usage: { estimatedInputTokens: 10, estimatedOutputTokens: 3 },
    apiKey: "SECRET",
    prompt: "hidden prompt",
  });

  assert.equal(dto.text, "Answer [1]");
  assert.equal(dto.model, "gemini-3.5-flash");
  assert.equal(dto.keySlot, 1);
  assert.equal(JSON.stringify(dto).includes("SECRET"), false);
  assert.equal(JSON.stringify(dto).includes("hidden prompt"), false);
});
