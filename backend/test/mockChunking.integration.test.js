import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { createChunkDraftsForMockDocument } = await import(
  "../src/services/chunking/chunkingPipeline.service.js"
);

async function chunkMock(slug) {
  return createChunkDraftsForMockDocument({ slug });
}

test("mock chunking creates drafts for markdown mock document", async () => {
  const result = await chunkMock("01-strategy-rollout/centraldocs-transformation-brief.md");

  assert.ok(result.chunks.length >= 1);
  assert.equal(result.chunks[0].scope, "mock");
  assert.equal(result.chunks[0].chunkIndex, 0);
});

test("mock chunking creates drafts for PDF mock document with page locator", async () => {
  const result = await chunkMock("02-document-operations/document-management-policy.pdf");

  assert.ok(result.chunks.length >= 1);
  assert.ok(result.chunks.some((chunk) => chunk.sourceLocator.pageNumber));
});

test("mock chunking creates drafts for CSV and TSV mock documents with row locators", async () => {
  const csv = await chunkMock("04-customer-support-signals/customer-feedback-export.csv");
  const tsv = await chunkMock("02-document-operations/support-knowledge-playbook.tsv");

  assert.ok(csv.chunks.some((chunk) => chunk.sourceLocator.rowStart));
  assert.ok(tsv.chunks.some((chunk) => chunk.sourceLocator.rowStart));
});

test("mock chunking creates drafts for XLSX mock document with sheet locator", async () => {
  const result = await chunkMock("03-finance-vendors/invoice-tracking-sample.xlsx");

  assert.ok(result.chunks.length >= 1);
  assert.ok(result.chunks.some((chunk) => chunk.sourceLocator.sheetName));
});

test("mock chunking creates drafts for PPTX mock document with slide locator or warning", async () => {
  const result = await chunkMock("01-strategy-rollout/digital-workspace-rollout-plan.pptx");

  assert.ok(result.chunks.length >= 1 || result.warnings.length >= 1);
  if (result.chunks.length > 0) {
    assert.ok(result.chunks.some((chunk) => chunk.sourceLocator.slideNumber));
  }
});

test("mock chunking creates drafts for audio and video sidecars", async () => {
  const audio = await chunkMock("05-meeting-evidence/rollout-risk-discussion.mp3");
  const video = await chunkMock("05-meeting-evidence/staff-training-demo.mp4");

  assert.ok(audio.chunks.length >= 1);
  assert.ok(video.chunks.length >= 1);
  assert.ok(audio.chunks.every((chunk) => !("_id" in chunk)));
  assert.ok(video.chunks.every((chunk) => !("_id" in chunk)));
});
