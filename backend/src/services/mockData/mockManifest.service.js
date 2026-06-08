import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHttpError } from "../../utils/httpError.js";

const manifestPath = fileURLToPath(new URL("../../../mock-data/manifest.json", import.meta.url));

let manifestCache = null;

export async function loadMockManifest({ forceReload = false } = {}) {
  if (manifestCache && !forceReload) {
    return manifestCache;
  }

  try {
    const fileContents = await readFile(manifestPath, "utf8");
    manifestCache = JSON.parse(fileContents);
    return manifestCache;
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
