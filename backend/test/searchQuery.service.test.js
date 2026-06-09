import { test } from "node:test";
import assert from "node:assert/strict";

const { buildSearchRequest } = await import("../src/services/search/searchQuery.service.js");

test("search query service trims query and applies defaults", () => {
  const request = buildSearchRequest({ query: "  document search pain points  " });

  assert.equal(request.query, "document search pain points");
  assert.equal(request.topK, 6);
  assert.equal(request.scope, "all");
  assert.deepEqual(request.selectedDocumentIds, []);
  assert.deepEqual(request.selectedFolderIds, []);
});

test("search query service rejects empty and over-long queries", () => {
  assert.throws(() => buildSearchRequest({ query: "   " }), {
    statusCode: 400,
    code: "SEARCH_QUERY_EMPTY",
  });
  assert.throws(() => buildSearchRequest({ query: "A".repeat(501) }), {
    statusCode: 400,
    code: "SEARCH_QUERY_TOO_LONG",
  });
});

test("search query service validates topK", () => {
  assert.equal(buildSearchRequest({ query: "risk", topK: 10 }).topK, 10);
  assert.throws(() => buildSearchRequest({ query: "risk", topK: 0 }), {
    code: "INVALID_SEARCH_TOP_K",
  });
  assert.throws(() => buildSearchRequest({ query: "risk", topK: 11 }), {
    code: "INVALID_SEARCH_TOP_K",
  });
});

test("search query service validates scope and file kinds", () => {
  assert.equal(buildSearchRequest({ query: "risk", scope: "mock" }).scope, "mock");
  assert.throws(() => buildSearchRequest({ query: "risk", scope: "private" }), {
    code: "INVALID_SEARCH_SCOPE",
  });
  assert.deepEqual(buildSearchRequest({ query: "risk", fileKinds: ["pdf", "pdf", "image"] }).fileKinds, [
    "pdf",
    "image",
  ]);
  assert.throws(() => buildSearchRequest({ query: "risk", fileKinds: ["exe"] }), {
    code: "INVALID_FILE_KIND",
  });
});
