import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHttpError } from "../../utils/httpError.js";

const manifestPath = fileURLToPath(new URL("../../../mock-data/manifest.json", import.meta.url));

let manifestCache = null;

export async function loadMockManifest({ forceReload = false, manifestFilePath = manifestPath } = {}) {
  const usesDefaultManifest = manifestFilePath === manifestPath;

  if (usesDefaultManifest && manifestCache && !forceReload) {
    return manifestCache;
  }

  try {
    const fileContents = await readFile(manifestFilePath, "utf8");
    const manifest = JSON.parse(fileContents);

    if (usesDefaultManifest) {
      manifestCache = manifest;
    }

    return manifest;
  } catch (error) {
    throw createHttpError(
      500,
      "Mock manifest could not be loaded.",
      "MOCK_MANIFEST_LOAD_FAILED",
    );
  }
}

export async function getDemoGuideFromManifest() {
  const manifest = await loadMockManifest();

  return {
    workspaceTitle: manifest.workspaceTitle,
    description: manifest.description,
    sampleQuestions: manifest.sampleQuestions || [],
    folders: manifest.folders || [],
    documentCount: Array.isArray(manifest.documents) ? manifest.documents.length : 0,
    mockDataRules: manifest.mockDataRules || {},
  };
}
