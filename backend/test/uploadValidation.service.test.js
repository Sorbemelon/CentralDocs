import { test } from "node:test";
import assert from "node:assert/strict";

const { validateUploadFile } = await import(
  "../src/services/uploads/uploadValidation.service.js"
);

function file({ name, mimetype, buffer }) {
  return {
    originalname: name,
    mimetype,
    buffer,
    size: buffer.length,
  };
}

const validFiles = [
  ["notes.txt", "text/plain", Buffer.from("plain notes"), "text"],
  ["brief.md", "text/markdown", Buffer.from("# Brief"), "markdown"],
  ["risks.csv", "text/csv", Buffer.from("Risk,Owner\nApproval,Ana"), "csv"],
  ["rows.tsv", "text/tab-separated-values", Buffer.from("Risk\tOwner\nDelay\tMo"), "tsv"],
  ["policy.pdf", "application/pdf", Buffer.from("%PDF-1.4\nbody"), "pdf"],
  [
    "memo.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    Buffer.from("PK\u0003\u0004docx"),
    "docx",
  ],
];

for (const [name, mimetype, buffer, fileKind] of validFiles) {
  test(`upload validation accepts ${name}`, () => {
    const result = validateUploadFile(file({ name, mimetype, buffer }));

    assert.equal(result.fileKind, fileKind);
    assert.equal(result.sizeBytes, buffer.length);
  });
}

test("upload validation rejects disallowed rich media and office formats", () => {
  for (const [name, mimetype] of [
    ["sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ["deck.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    ["image.png", "image/png"],
    ["audio.mp3", "audio/mpeg"],
    ["video.mp4", "video/mp4"],
  ]) {
    assert.throws(
      () => validateUploadFile(file({ name, mimetype, buffer: Buffer.from("binary") })),
      { code: "UPLOAD_UNSUPPORTED_FILE_TYPE" },
    );
  }
});

test("upload validation rejects archives, executables, unknown files, empty files, and binary text", () => {
  for (const [name, mimetype, buffer] of [
    ["archive.zip", "application/zip", Buffer.from("PK")],
    ["run.exe", "application/x-msdownload", Buffer.from("MZ")],
    ["unknown.bin", "application/octet-stream", Buffer.from("binary")],
    ["bad.txt", "text/plain", Buffer.from([0, 1, 2])],
  ]) {
    assert.throws(() => validateUploadFile(file({ name, mimetype, buffer })), {
      code: "UPLOAD_UNSUPPORTED_FILE_TYPE",
    });
  }

  assert.throws(
    () => validateUploadFile(file({ name: "empty.txt", mimetype: "text/plain", buffer: Buffer.alloc(0) })),
    { code: "UPLOAD_EMPTY_FILE" },
  );
});

test("upload validation rejects oversized files by public type limit", () => {
  assert.throws(
    () =>
      validateUploadFile(
        file({
          name: "large.txt",
          mimetype: "text/plain",
          buffer: Buffer.alloc(500 * 1024 + 1, "a"),
        }),
      ),
    { code: "UPLOAD_FILE_TOO_LARGE" },
  );
  assert.throws(
    () =>
      validateUploadFile(
        file({
          name: "large.docx",
          mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          buffer: Buffer.concat([Buffer.from("PK\u0003\u0004"), Buffer.alloc(1024 * 1024 + 1)]),
        }),
      ),
    { code: "UPLOAD_FILE_TOO_LARGE" },
  );
  assert.throws(
    () =>
      validateUploadFile(
        file({
          name: "large.pdf",
          mimetype: "application/pdf",
          buffer: Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(2 * 1024 * 1024 + 1)]),
        }),
      ),
    { code: "UPLOAD_FILE_TOO_LARGE" },
  );
});

test("upload validation uses MIME and signature checks", () => {
  assert.throws(
    () =>
      validateUploadFile(
        file({ name: "fake.pdf", mimetype: "application/pdf", buffer: Buffer.from("not pdf") }),
      ),
    { code: "UPLOAD_UNSUPPORTED_FILE_TYPE" },
  );
  assert.throws(
    () =>
      validateUploadFile(
        file({ name: "fake.docx", mimetype: "application/zip", buffer: Buffer.from("not zip") }),
      ),
    { code: "UPLOAD_UNSUPPORTED_FILE_TYPE" },
  );
  assert.throws(
    () =>
      validateUploadFile(
        file({ name: "renamed.txt", mimetype: "image/png", buffer: Buffer.from("text") }),
      ),
    { code: "UPLOAD_UNSUPPORTED_FILE_TYPE" },
  );
});
