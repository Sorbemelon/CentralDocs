import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
delete process.env.GEMINI_API_KEY_1;
delete process.env.GEMINI_API_KEY_2;
delete process.env.GEMINI_API_KEY_3;
delete process.env.GEMINI_API_KEYS;

const {
  assertEmbeddingConfigured,
  embedText,
  embedTexts,
  getEmbeddingServiceStatus,
} = await import("../src/services/ai/geminiEmbedding.service.js");

function fakeVector(value = 0.1) {
  return Array.from({ length: 768 }, () => value);
}

test("Gemini embedding service reports locked model status safely", () => {
  const status = getEmbeddingServiceStatus();

  assert.equal(status.provider, "gemini");
  assert.equal(status.model, "gemini-embedding-2");
  assert.equal(status.dimensions, 768);
  assert.equal("apiKey" in status, false);
});

test("Gemini embedding service uses locked model and requests 768 dimensions", async () => {
  let captured = null;
  const client = {
    models: {
      embedContent: async (payload) => {
        captured = payload;
        return { embeddings: [{ values: fakeVector(0.2) }] };
      },
    },
  };

  const result = await embedText({
    text: "CentralDocs chunk content",
    title: "Policy",
    client,
    keySlot: 2,
  });

  assert.equal(captured.model, "gemini-embedding-2");
  assert.equal(captured.config.outputDimensionality, 768);
  assert.equal(captured.config.taskType, "RETRIEVAL_DOCUMENT");
  assert.equal(captured.config.title, "Policy");
  assert.equal(result.model, "gemini-embedding-2");
  assert.equal(result.dimensions, 768);
  assert.equal(result.embedding.length, 768);
  assert.equal(result.keySlot, 2);
});

test("Gemini embedding service rejects empty and over-large input", async () => {
  await assert.rejects(() => embedText({ text: "   ", client: {} }), {
    statusCode: 400,
    code: "EMBEDDING_INPUT_EMPTY",
  });
  await assert.rejects(() => embedText({ text: "A".repeat(24001), client: {} }), {
    statusCode: 400,
    code: "EMBEDDING_INPUT_TOO_LARGE",
  });
});

test("Gemini embedding service avoids live call when not configured", async () => {
  assert.throws(() => assertEmbeddingConfigured(), {
    statusCode: 503,
    code: "EMBEDDING_NOT_CONFIGURED",
  });
  await assert.rejects(() => embedText({ text: "No configured keys" }), {
    statusCode: 503,
    code: "EMBEDDING_NOT_CONFIGURED",
  });
});

test("Gemini embedding service rotates key slots on rate limit", async () => {
  const calledSlots = [];
  const result = await embedText({
    text: "Rotate on rate limit",
    keySlots: [0, 1],
    clientFactory: (slot) => ({
      models: {
        embedContent: async () => {
          calledSlots.push(slot);
          if (slot === 0) {
            const error = new Error("quota exceeded");
            error.status = 429;
            throw error;
          }
          return { embeddings: [{ values: fakeVector(0.3) }] };
        },
      },
    }),
  });

  assert.deepEqual(calledSlots, [0, 1]);
  assert.equal(result.keySlot, 1);
  assert.equal(result.attempts[0].status, "failed");
  assert.equal(result.attempts[0].isRateLimit, true);
  assert.equal(result.attempts[1].status, "success");
});

test("Gemini embedding service exhausts all rate-limited key slots safely", async () => {
  await assert.rejects(
    () =>
      embedText({
        text: "All slots fail",
        keySlots: [0, 1],
        clientFactory: (slot) => ({
          models: {
            embedContent: async () => {
              const error = new Error(`slot ${slot} too many requests`);
              error.status = 429;
              throw error;
            },
          },
        }),
      }),
    {
      statusCode: 429,
      code: "AI_RATE_LIMIT_EXHAUSTED",
    },
  );
});

test("Gemini embedding service does not expose secret text in provider errors", async () => {
  await assert.rejects(
    () =>
      embedText({
        text: "Provider fails",
        client: {
          models: {
            embedContent: async () => {
              throw new Error("bad key SECRET_TOKEN");
            },
          },
        },
      }),
    (error) => {
      assert.equal(JSON.stringify(error).includes("SECRET_TOKEN"), false);
      assert.equal(error.code, "EMBEDDING_PROVIDER_ERROR");
      return true;
    },
  );
});

test("Gemini embedding service embeds multiple texts sequentially with fake client", async () => {
  const calls = [];
  const client = {
    models: {
      embedContent: async (payload) => {
        calls.push(payload.contents);
        return { embeddings: [{ values: fakeVector(0.4) }] };
      },
    },
  };
  const results = await embedTexts({ texts: ["one", "two"], client });

  assert.deepEqual(calls, ["one", "two"]);
  assert.equal(results.length, 2);
  assert.equal(results[0].embedding.length, 768);
});
