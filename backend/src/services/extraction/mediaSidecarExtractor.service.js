import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  EXTRACTION_ERROR_CODE,
  EXTRACTION_FILE_KIND,
} from "../../constants/extraction.constants.js";
import { createHttpError } from "../../utils/httpError.js";
import { resolveMockAssetPath } from "../mockData/mockAsset.service.js";
import { buildExtractionResult, makeSourceBlock } from "./extractionResult.dto.js";
import { normalizeLineEndings } from "./normalizeText.service.js";

function titleFromDocument(document = {}) {
  return document.title || path.basename(document.filename || "media");
}

function describeFromManifest(document = {}) {
  const topics = Array.isArray(document.expectedTopics) ? document.expectedTopics : [];
  const questions = Array.isArray(document.demoQuestions) ? document.demoQuestions : [];
  return [
    document.title,
    topics.length > 0 ? `Topics: ${topics.join(", ")}.` : null,
    questions.length > 0 ? `Demo questions: ${questions.join(" ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function parseTimestampToSeconds(value) {
  const parts = String(value || "")
    .split(":")
    .map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

function blocksFromSidecarText(text, document) {
  const lines = normalizeLineEndings(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks = [];
  let sectionTitle = null;

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      sectionTitle = heading[2].trim();
      blocks.push(
        makeSourceBlock({
          blockIndex: blocks.length,
          blockType: "section",
          text: sectionTitle,
          locator: { sectionTitle },
        }),
      );
      continue;
    }

    const timestamp = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-:]\s*(.+)$/);
    const timestampSeconds = timestamp ? parseTimestampToSeconds(timestamp[1]) : null;
    blocks.push(
      makeSourceBlock({
        blockIndex: blocks.length,
        blockType: timestamp ? "media_transcript" : "media_note",
        text: timestamp ? timestamp[2].trim() : line,
        locator: {
          ...(sectionTitle ? { sectionTitle } : {}),
          ...(timestampSeconds !== null ? { mediaTimestampStart: timestampSeconds } : {}),
        },
        metadata: {
          sourceFilename: document.filename,
          directMultimodalEmbeddingSeeded:
            document.indexingMode === "direct_multimodal_seed_cached",
        },
      }),
    );
  }

  return blocks;
}

function getSidecarCandidates(document = {}) {
  const extension = path.extname(document.filename || "");
  const base = path.basename(document.filename || "", extension);
  const folderSlug = document.folderSlug;

  if (document.fileKind === EXTRACTION_FILE_KIND.AUDIO) {
    return [`${base}-transcript.md`, `${base}-notes.md`].map((filename) => ({
      folderSlug,
      filename,
      relativePath: `documents/${folderSlug}/${filename}`,
    }));
  }
  if (document.fileKind === EXTRACTION_FILE_KIND.VIDEO) {
    return [`${base}-notes.md`, `${base}-transcript.md`].map((filename) => ({
      folderSlug,
      filename,
      relativePath: `documents/${folderSlug}/${filename}`,
    }));
  }

  return [`${base}-notes.md`, `${base}-description.md`].map((filename) => ({
    folderSlug,
    filename,
    relativePath: `documents/${folderSlug}/${filename}`,
  }));
}

function findManifestSidecar(manifest, candidate) {
  return (manifest.documents || []).find(
    (document) =>
      document.folderSlug === candidate.folderSlug &&
      document.filename === candidate.filename,
  );
}

async function readFirstAvailableSidecar(document, manifest) {
  for (const candidate of getSidecarCandidates(document)) {
    try {
      const localPath = resolveMockAssetPath(candidate);
      return {
        text: await readFile(localPath, "utf8"),
        manifestDocument: findManifestSidecar(manifest, candidate) || candidate,
      };
    } catch (error) {
      if (error.code !== "ENOENT") {
        continue;
      }
    }
  }

  return null;
}

export async function extractMediaSidecar({
  document,
  manifest = {},
  originalFilename = document?.filename,
} = {}) {
  const fileKind = document?.fileKind;
  const sidecar = await readFirstAvailableSidecar(document, manifest);
  const manifestDescription = describeFromManifest(document);

  if (!sidecar && fileKind !== EXTRACTION_FILE_KIND.IMAGE && !manifestDescription) {
    throw createHttpError(
      404,
      "Media sidecar content was not found.",
      EXTRACTION_ERROR_CODE.MEDIA_SIDECAR_NOT_FOUND,
    );
  }

  const extractedText = sidecar ? sidecar.text : manifestDescription;
  const sourceBlocks = sidecar
    ? blocksFromSidecarText(sidecar.text, document)
    : [
        makeSourceBlock({
          blockIndex: 0,
          blockType: "media_description",
          text: manifestDescription,
          locator: {},
          metadata: {
            sourceFilename: document.filename,
            directMultimodalEmbeddingSeeded:
              document.indexingMode === "direct_multimodal_seed_cached",
          },
        }),
      ];

  return buildExtractionResult({
    title: titleFromDocument(document),
    fileKind,
    originalFilename,
    extractedText,
    sourceBlocks,
    warnings: sidecar
      ? []
      : [
          {
            code: "MEDIA_MANIFEST_DESCRIPTION_ONLY",
            message: "Media extraction used manifest description only.",
          },
        ],
  });
}
