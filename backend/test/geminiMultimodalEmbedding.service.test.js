import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

process.env.NODE_ENV = "test";
delete process.env.GEMINI_API_KEY_1;
delete process.env.GEMINI_API_KEY_2;
delete process.env.GEMINI_API_KEY_3;
delete process.env.GEMINI_API_KEYS;

const {
  assertMultimodalEmbeddingConfigured,
  embedMediaFile,
  getMultimodalEmbeddingStatus,
} = await import("../src/services/ai/geminiMultimodalEmbedding.service.js");
const { getMockDocumentsRoot } = await import("../src/services/mockData/mockAsset.service.js");

function fakeVector(value = 0.1) {
  return Array.from({ length: 768 }, () => value);
}

function mockAssetPath(relativePath) {
  return path.join(getMockDocumentsRoot(), relativePath);
}

test("Gemini multimodal embedding service reports locked model status safely", () => {
  const status = getMultimodalEmbeddingStatus();

  assert.equal(status.provider, "gemini");
  assert.equal(status.model, "gemini-embedding-2");
  assert.equal(status.dimensions, 768);
  assert.equal("apiKey" in status, false);
});

test("Gemini multimodal embedding service uses locked model and requests 768 dimensions", async () => {
  let captured = null;
  const client = {
    models: {
      embedContent: async (payload) => {
        captured = payload;
        return { embedding: { values: fakeVector(0.2) } };
      },
    },
  };

  const result = await embedMediaFile({
    filePath: mockAssetPath("01-strategy-rollout/intake-to-ai-search-workflow.png"),
    mimeType: "image/png",
    title: "Workflow",
    client,
    keySlot: 2,
  });

  assert.equal(captured.model, "gemini-embedding-2");
  assert.equal(captured.config.outputDimensionality, 768);
  assert.equal(captured.contents[0].inlineData.mimeType, "image/png");
  assert.equal(result.model, "gemini-embedding-2");
  assert.equal(result.dimensions, 768);
  assert.equal(result.embedding.length, 768);
  assert.equal(result.inputType, "image");
  assert.equal(result.keySlot, 2);
});

test("Gemini multimodal embedding service accepts fake image, audio, and video clients", async () => {
  const cases = [
    ["01-strategy-rollout/intake-to-ai-search-workflow.png", "image/png", "image"],
    ["05-meeting-evidence/rollout-risk-discussion.mp3", "audio/mpeg", "audio"],
    ["05-meeting-evidence/staff-training-demo.mp4", "video/mp4", "video"],
  ];

  for (const [relativePath, mimeType, inputType] of cases) {
    const result = await embedMediaFile({
      filePath: mockAssetPath(relativePath),
      mimeType,
      client: { embedContent: async () => fakeVector(0.3) },
    });

    assert.equal(result.inputType, inputType);
    assert.equal(result.embedding.length, 768);
  }
});

test("Gemini multimodal embedding service rejects missing file and unsupported MIME", async () => {
  await assert.rejects(
    () =>
      embedMediaFile({
        filePath: mockAssetPath("missing-media.png"),
        mimeType: "image/png",
        client: { embedContent: async () => fakeVector() },
      }),
    {
      statusCode: 404,
      code: "MEDIA_ASSET_NOT_FOUND",
    },
  );

  await assert.rejects(
    () =>
      embedMediaFile({
        filePath: mockAssetPath("01-strategy-rollout/intake-to-ai-search-workflow.png"),
        mimeType: "text/plain",
        client: { embedContent: async () => fakeVector() },
      }),
    {
      statusCode: 400,
      code: "MEDIA_EMBEDDING_UNSUPPORTED",
    },
  );
});

test("Gemini multimodal embedding service avoids live call when not configured", async () => {
  assert.throws(() => assertMultimodalEmbeddingConfigured(), {
    statusCode: 503,
    code: "MEDIA_EMBEDDING_NOT_CONFIGURED",
  });

  await assert.rejects(
    () =>
      embedMediaFile({
        filePath: mockAssetPath("01-strategy-rollout/intake-to-ai-search-workflow.png"),
        mimeType: "image/png",
      }),
    {
      statusCode: 503,
      code: "MEDIA_EMBEDDING_NOT_CONFIGURED",
    },
  );
});

test("Gemini multimodal embedding service rotates key slots on rate limit", async () => {
  const calledSlots = [];
  const result = await embedMediaFile({
    filePath: mockAssetPath("01-strategy-rollout/intake-to-ai-search-workflow.png"),
    mimeType: "image/png",
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
          return { embeddings: [{ values: fakeVector(0.4) }] };
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

test("Gemini multimodal embedding service returns safe provider errors", async () => {
  await assert.rejects(
    () =>
      embedMediaFile({
        filePath: mockAssetPath("01-strategy-rollout/intake-to-ai-search-workflow.png"),
        mimeType: "image/png",
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
      assert.equal(error.code, "MEDIA_EMBEDDING_PROVIDER_ERROR");
      return true;
    },
  );
});
