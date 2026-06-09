import { test } from "node:test";
import assert from "node:assert/strict";

const { buildGeneratedDocumentPrompt } = await import(
  "../src/services/generatedDocuments/generatedDocumentPrompt.service.js"
);
const { normalizeGeneratedDocumentFilename } = await import(
  "../src/services/generatedDocuments/generatedDocumentFilename.service.js"
);

function promptFor(overrides = {}) {
  return buildGeneratedDocumentPrompt({
    chat: { title: "Rollout Risk Chat" },
    instruction: "Create an internal briefing with findings and next steps.",
    messages: [
      { role: "user", content: "What are the risks?" },
      {
        role: "assistant",
        content:
          "Approval ownership is unclear. objectKey=demo-sessions/demo_1/generated/doc/file.md",
      },
    ],
    promptReferences: [
      {
        citationNumber: 1,
        label: "[1] Risk Register",
        excerptPreview: "Approval ownership is unresolved.",
        location: "rows 4-8",
      },
    ],
    selection: {
      resolvedDocuments: [{ title: "Risk Register", fileKind: "csv", folderName: "Operations" }],
    },
    filenameMeta: normalizeGeneratedDocumentFilename("brief.md"),
    includeReferences: true,
    includeCurrentSelectedDocuments: true,
    ...overrides,
  });
}

test("generated document prompt includes instruction, chat title, messages, context, and references", () => {
  const result = promptFor();

  assert.match(result.prompt, /Create an internal briefing/);
  assert.match(result.prompt, /Rollout Risk Chat/);
  assert.match(result.prompt, /What are the risks/);
  assert.match(result.prompt, /Risk Register/);
  assert.match(result.prompt, /\[1\]/);
  assert.match(result.prompt, /Produce clean Markdown/);
  assert.match(result.prompt, /Do not invent/);
});

test("generated document prompt can omit references and selected context", () => {
  const result = promptFor({
    includeReferences: false,
    includeCurrentSelectedDocuments: false,
  });

  assert.match(result.prompt, /References were not requested/);
  assert.match(result.prompt, /intentionally not included/);
});

test("generated document prompt asks for plain text for txt output", () => {
  const result = promptFor({
    filenameMeta: normalizeGeneratedDocumentFilename("brief.txt"),
  });

  assert.match(result.prompt, /Produce plain text/);
});

test("generated document prompt avoids sensitive implementation details", () => {
  const result = promptFor({
    instruction:
      "Use api_key=SECRET and C:\\Users\\Example\\secret.txt and embedding [0.1,0.2]",
  });

  assert.equal(result.prompt.includes("SECRET"), false);
  assert.equal(result.prompt.includes("C:\\Users\\Example"), false);
  assert.equal(result.systemInstruction.includes("storage keys"), true);
});
