export const AI_MODELS = Object.freeze({
  embedding: {
    model: "gemini-embedding-2",
    dimensions: 768,
  },
  generation: {
    primary: "gemini-3.5-flash",
    fallbacks: ["gemini-3-flash-preview", "gemini-2.5-flash"],
  },
});

export const GENERATION_MODEL_LANE = Object.freeze([
  AI_MODELS.generation.primary,
  ...AI_MODELS.generation.fallbacks,
]);

export const AI_ROUTING_DESIGN = Object.freeze({
  provider: "gemini",
  liveCallsEnabled: false,
  keyRotation: "planned_round_robin_with_failure_fallback",
  notes: [
    "Phase 1A defines model lanes only; no Gemini network calls are made.",
    "Future routing should rotate across configured keys before falling back models.",
    "Future live-call failures should be recorded without logging API keys or prompt bodies.",
  ],
});
