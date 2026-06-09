import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
delete process.env.GEMINI_API_KEY_1;
delete process.env.GEMINI_API_KEY_2;
delete process.env.GEMINI_API_KEY_3;
delete process.env.GEMINI_API_KEYS;

const {
  assertGenerationConfigured,
  generateTextWithLane,
  getGenerationServiceStatus,
} = await import("../src/services/ai/geminiGeneration.service.js");

test("Gemini generation service reports locked lane safely", () => {
  const status = getGenerationServiceStatus();

  assert.equal(status.provider, "gemini");
  assert.deepEqual(status.generationModelLane, [
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
  ]);
  assert.equal("apiKey" in status, false);
});

test("Gemini generation service uses fake client and primary model", async () => {
  let captured = null;
  const result = await generateTextWithLane({
    prompt: "Question",
    systemInstruction: "System",
    client: {
      models: {
        generateContent: async (payload) => {
          captured = payload;
          return { text: "Grounded answer [1]" };
        },
      },
    },
  });

  assert.equal(captured.model, "gemini-3.5-flash");
  assert.equal(captured.contents, "Question");
  assert.equal(captured.config.systemInstruction, "System");
  assert.equal(result.text, "Grounded answer [1]");
  assert.equal(result.model, "gemini-3.5-flash");
  assert.equal(result.fallbackUsed, false);
});

test("Gemini generation service rotates key slots before fallback model", async () => {
  const calls = [];
  const result = await generateTextWithLane({
    prompt: "Question",
    keySlots: [0, 1],
    models: ["gemini-3.5-flash", "gemini-3-flash-preview"],
    clientFactory: (slot) => ({
      models: {
        generateContent: async (payload) => {
          calls.push({ slot, model: payload.model });
          if (payload.model === "gemini-3.5-flash") {
            const error = new Error("quota exceeded");
            error.status = 429;
            throw error;
          }
          return { text: "Fallback answer [1]" };
        },
      },
    }),
  });

  assert.deepEqual(calls, [
    { slot: 0, model: "gemini-3.5-flash" },
    { slot: 1, model: "gemini-3.5-flash" },
    { slot: 0, model: "gemini-3-flash-preview" },
  ]);
  assert.equal(result.model, "gemini-3-flash-preview");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.fallbackLevel, 1);
});

test("Gemini generation service reports exhaustion and provider errors safely", async () => {
  await assert.rejects(
    () =>
      generateTextWithLane({
        prompt: "Question",
        keySlots: [0, 1],
        models: ["gemini-3.5-flash"],
        clientFactory: () => ({
          models: {
            generateContent: async () => {
              const error = new Error("too many requests SECRET_KEY");
              error.status = 429;
              throw error;
            },
          },
        }),
      }),
    (error) => {
      assert.equal(error.code, "AI_RATE_LIMIT_EXHAUSTED");
      assert.equal(JSON.stringify(error).includes("SECRET_KEY"), false);
      return true;
    },
  );

  await assert.rejects(
    () =>
      generateTextWithLane({
        prompt: "Question",
        client: {
          models: {
            generateContent: async () => {
              throw new Error("bad provider SECRET_KEY");
            },
          },
        },
      }),
    (error) => {
      assert.equal(error.code, "GENERATION_PROVIDER_ERROR");
      assert.equal(JSON.stringify(error).includes("SECRET_KEY"), false);
      return true;
    },
  );
});

test("Gemini generation service avoids live calls when not configured", () => {
  assert.throws(() => assertGenerationConfigured(), {
    statusCode: 503,
    code: "GENERATION_NOT_CONFIGURED",
  });
});
