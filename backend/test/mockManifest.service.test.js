import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { loadMockManifest, getDemoGuideFromManifest } = await import(
  "../src/services/mockData/mockManifest.service.js"
);

test("mock manifest loads connected Orchid Retail workspace metadata", async () => {
  const manifest = await loadMockManifest({ forceReload: true });

  assert.equal(manifest.workspaceTitle, "Orchid Retail Digital Transformation");
  assert.match(manifest.description, /CentralDocs demo/);
  assert.equal(manifest.mockDataRules.readOnly, true);
  assert.ok(Array.isArray(manifest.documents));
  assert.equal(manifest.documents.length, 16);
  assert.ok(manifest.documents.every((document) => document.sourceType === "mock"));
});

test("demo guide returns sample questions and expected document count", async () => {
  const manifest = await loadMockManifest();
  const guide = await getDemoGuideFromManifest();

  assert.ok(guide.sampleQuestions.length > 0);
  assert.equal(guide.documentCount, manifest.documents.length);
  assert.equal(guide.folders.length, manifest.folders.length);
});

test("manifest loader fails safely for missing or invalid manifest paths", async () => {
  await assert.rejects(
    () => loadMockManifest({ manifestFilePath: join(tmpdir(), "missing-centraldocs-manifest.json") }),
    {
      statusCode: 500,
      code: "MOCK_MANIFEST_LOAD_FAILED",
    },
  );

  const invalidPath = join(tmpdir(), `invalid-centraldocs-manifest-${process.pid}.json`);
  await writeFile(invalidPath, "{ invalid json", "utf8");

  await assert.rejects(() => loadMockManifest({ manifestFilePath: invalidPath }), {
    statusCode: 500,
    code: "MOCK_MANIFEST_LOAD_FAILED",
  });
  await unlink(invalidPath);
});

test("manifest file remains valid JSON on disk", async () => {
  const rawManifest = await readFile(new URL("../mock-data/manifest.json", import.meta.url), "utf8");
  const parsed = JSON.parse(rawManifest);

  assert.equal(parsed.workspaceTitle, "Orchid Retail Digital Transformation");
});
