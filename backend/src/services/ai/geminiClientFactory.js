import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKeys } from "../../config/env.js";

export function getGeminiClientStatus() {
  const keyCount = getGeminiApiKeys().length;
  const configured = keyCount > 0;

  return {
    provider: "gemini",
    status: configured ? "configured" : "not_configured",
    configured,
    keyCount,
    liveRuntime: {
      enabled: configured,
      reason: configured ? "configured" : "missing_api_key",
    },
  };
}

export function createGeminiClientForKeyIndex(index = 0) {
  const keys = getGeminiApiKeys();
  const apiKey = keys[index];

  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({ apiKey });
}

export function getGeminiKeySlots() {
  return getGeminiApiKeys().map((_, index) => ({
    keySlot: index,
    configured: true,
  }));
}

export function createGeminiClientForKeySlot(keySlot = 0) {
  return createGeminiClientForKeyIndex(keySlot);
}
