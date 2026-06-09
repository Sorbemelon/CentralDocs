import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKeys } from "../../config/env.js";

export function getGeminiClientStatus() {
  const keyCount = getGeminiApiKeys().length;

  return {
    provider: "gemini",
    status: keyCount > 0 ? "configured" : "not_configured",
    keyCount,
    liveCallsEnabled: false,
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
