import { test } from "node:test";
import assert from "node:assert/strict";

const { DEMO_LIMITS } = await import("../src/config/limits.js");
const {
  assertCanCreateChat,
  assertCanCreateFolder,
  assertCanGenerateDocument,
  assertCanSendAiPrompt,
  assertCanUploadFile,
  assertGenerateDocumentInstructionLength,
  assertPromptLength,
  assertSemanticSearchQueryLength,
  getRemainingLimits,
} = await import("../src/services/demo/demoUsage.service.js");
const { buildSearchRequest } = await import("../src/services/search/searchQuery.service.js");
const { validateUploadFile } = await import("../src/services/uploads/uploadValidation.service.js");
const { normalizeGeneratedDocumentFilename } = await import(
  "../src/services/generatedDocuments/generatedDocumentFilename.service.js"
);

function uploadFile({ name, size, mimetype, fill = "a" }) {
  let buffer;
  if (name.endsWith(".pdf")) {
    buffer = Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(Math.max(0, size - 5), fill)]);
  } else if (name.endsWith(".docx")) {
    buffer = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(Math.max(0, size - 4), fill)]);
  } else {
    buffer = Buffer.alloc(size, fill);
  }

  return {
    originalname: name,
    mimetype,
    buffer,
    size: buffer.length,
  };
}

test("locked demo limits match backend usage enforcement", () => {
  assert.equal(DEMO_LIMITS.maxUploadedFiles, 5);
  assert.equal(DEMO_LIMITS.maxChatSessions, 5);
  assert.equal(DEMO_LIMITS.maxAiPrompts, 10);
  assert.equal(DEMO_LIMITS.maxGeneratedDocuments, 3);
  assert.equal(DEMO_LIMITS.maxUserFolders, 10);
  assert.equal(DEMO_LIMITS.maxStorageBytes, 20 * 1024 * 1024);
  assert.equal(DEMO_LIMITS.maxGeneratedDocumentBytes, 100 * 1024);
  assert.equal(DEMO_LIMITS.maxPromptLengthChars, 1500);
  assert.equal(DEMO_LIMITS.maxGenerateDocumentInstructionLengthChars, 2000);
  assert.equal(DEMO_LIMITS.maxSemanticSearchQueryLengthChars, 500);

  assert.throws(() => assertCanUploadFile({ usage: { uploadedFiles: 5 } }, 1), {
    code: "DEMO_LIMIT_REACHED",
  });
  assert.throws(
    () => assertCanUploadFile({ usage: { storageBytes: 20 * 1024 * 1024 - 1 } }, 2),
    { code: "DEMO_LIMIT_REACHED" },
  );
  assert.throws(() => assertCanCreateChat({ usage: { chatSessions: 5 } }), {
    code: "DEMO_LIMIT_REACHED",
  });
  assert.throws(() => assertCanSendAiPrompt({ usage: { aiPrompts: 10 } }), {
    code: "DEMO_LIMIT_REACHED",
  });
  assert.throws(() => assertCanGenerateDocument({ usage: { generatedDocuments: 3 } }), {
    code: "DEMO_LIMIT_REACHED",
  });
  assert.throws(() => assertCanCreateFolder({ usage: { userFolders: 10 } }), {
    code: "DEMO_LIMIT_REACHED",
  });
  assert.throws(() => assertPromptLength("x".repeat(1501)), {
    code: "DEMO_LIMIT_REACHED",
  });
  assert.throws(() => assertGenerateDocumentInstructionLength("x".repeat(2001)), {
    code: "DEMO_LIMIT_REACHED",
  });
  assert.throws(() => assertSemanticSearchQueryLength("x".repeat(501)), {
    code: "DEMO_LIMIT_REACHED",
  });

  const remaining = getRemainingLimits({
    usage: {
      uploadedFiles: 2,
      chatSessions: 1,
      aiPrompts: 3,
      generatedDocuments: 1,
      userFolders: 4,
      storageBytes: 1024,
    },
  });
  assert.equal(remaining.uploadedFiles, 3);
  assert.equal(remaining.chatSessions, 4);
  assert.equal(remaining.aiPrompts, 7);
});

test("upload file allowlist and size caps remain locked", () => {
  const accepted = [
    ["notes.txt", 500 * 1024, "text/plain"],
    ["brief.md", 500 * 1024, "text/markdown"],
    ["risks.csv", 500 * 1024, "text/csv"],
    ["rows.tsv", 500 * 1024, "text/tab-separated-values"],
    ["policy.pdf", 2 * 1024 * 1024, "application/pdf"],
    [
      "memo.docx",
      1024 * 1024,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  ];

  for (const [name, size, mimetype] of accepted) {
    assert.equal(validateUploadFile(uploadFile({ name, size, mimetype })).originalFilename, name);
  }

  for (const [name, mimetype] of [
    ["sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ["deck.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    ["photo.png", "image/png"],
    ["clip.mp3", "audio/mpeg"],
    ["movie.mp4", "video/mp4"],
    ["archive.zip", "application/zip"],
    ["run.exe", "application/x-msdownload"],
  ]) {
    assert.throws(
      () => validateUploadFile(uploadFile({ name, size: 16, mimetype })),
      { code: "UPLOAD_UNSUPPORTED_FILE_TYPE" },
    );
  }
});

test("query, prompt, and generated filename boundaries remain ready for routes", () => {
  assert.equal(buildSearchRequest({ query: "  risks  " }).query, "risks");
  assert.throws(() => buildSearchRequest({ query: "x".repeat(501) }), {
    code: "SEARCH_QUERY_TOO_LONG",
  });
  assert.equal(normalizeGeneratedDocumentFilename("brief.md").extension, "md");
  assert.equal(normalizeGeneratedDocumentFilename("brief.txt").extension, "txt");
  assert.throws(() => normalizeGeneratedDocumentFilename("brief.pdf"), {
    code: "GENERATED_DOCUMENT_UNSUPPORTED_FORMAT",
  });
});
