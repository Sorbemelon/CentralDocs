import { test } from "node:test";
import assert from "node:assert/strict";

const {
  buildUniqueGeneratedDocumentFilename,
  normalizeGeneratedDocumentFilename,
} = await import(
  "../src/services/generatedDocuments/generatedDocumentFilename.service.js"
);

test("generated document filename defaults empty values to summary.md", () => {
  assert.equal(normalizeGeneratedDocumentFilename("").filename, "summary.md");
  assert.equal(normalizeGeneratedDocumentFilename(undefined).filename, "summary.md");
});

test("generated document filename defaults to Markdown", () => {
  const result = normalizeGeneratedDocumentFilename("orchid brief");

  assert.equal(result.filename, "orchid_brief.md");
  assert.equal(result.extension, "md");
  assert.equal(result.fileKind, "markdown");
  assert.equal(result.contentType, "text/markdown; charset=utf-8");
});

test("generated document filename accepts Markdown and text formats", () => {
  assert.equal(normalizeGeneratedDocumentFilename("brief.md").filename, "brief.md");
  assert.equal(normalizeGeneratedDocumentFilename("brief.txt").fileKind, "text");
});

test("generated document filename rejects unsupported export extensions", () => {
  assert.throws(() => normalizeGeneratedDocumentFilename("brief.pdf"), {
    code: "GENERATED_DOCUMENT_UNSUPPORTED_FORMAT",
  });
  assert.throws(() => normalizeGeneratedDocumentFilename("brief.docx"), {
    code: "GENERATED_DOCUMENT_UNSUPPORTED_FORMAT",
  });
});

test("generated document filename rejects path traversal and path separators", () => {
  assert.throws(() => normalizeGeneratedDocumentFilename("../brief.md"), {
    code: "GENERATED_DOCUMENT_UNSUPPORTED_FORMAT",
  });
  assert.throws(() => normalizeGeneratedDocumentFilename("folder/brief.md"), {
    code: "GENERATED_DOCUMENT_UNSUPPORTED_FORMAT",
  });
  assert.throws(() => normalizeGeneratedDocumentFilename("folder\\brief.md"), {
    code: "GENERATED_DOCUMENT_UNSUPPORTED_FORMAT",
  });
});

test("generated document filename sanitizes unsafe characters and caps length", () => {
  const unsafe = normalizeGeneratedDocumentFilename("Q2 rollout brief (final)!.md");
  const long = normalizeGeneratedDocumentFilename(`${"a".repeat(200)}.txt`);

  assert.equal(unsafe.filename, "Q2_rollout_brief_final_.md");
  assert.equal(long.filename.length, 120);
  assert.equal(long.filename.endsWith(".txt"), true);
});

test("generated document filename adds a number when the name already exists", () => {
  assert.equal(
    normalizeGeneratedDocumentFilename("summary.md", {
      existingFilenames: ["summary.md"],
    }).filename,
    "summary (2).md",
  );
  assert.equal(
    normalizeGeneratedDocumentFilename("summary.md", {
      existingFilenames: ["summary.md", "summary (2).md"],
    }).filename,
    "summary (3).md",
  );
  assert.equal(
    buildUniqueGeneratedDocumentFilename("brief.txt", ["brief.txt"]),
    "brief (2).txt",
  );
});
