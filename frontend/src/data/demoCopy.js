// Static copy for the landing page and demo guide.
// Sourced from CENTRALDOCS_UX_SPEC.md and CENTRALDOCS_DEMO_MODE.md.

export const HERO = Object.freeze({
  name: "CentralDocs",
  tagline: "AI document workspace for digital transformation.",
  description:
    "Manage documents, search by meaning, chat with selected sources, and turn useful conversations into downloadable documents.",
});

export const PROBLEM_SOLUTION = Object.freeze({
  problem: {
    title: "Knowledge is scattered",
    body: "Strategy decks, SOPs, vendor checklists, support exports, and meeting recordings live in separate tools. Finding the one answer means opening ten files.",
  },
  solution: {
    title: "One grounded workspace",
    body: "CentralDocs organizes documents, searches them by meaning, and answers questions from the sources you select, with references you can verify and reuse.",
  },
});

/** Simple architecture diagram nodes (rendered as compact pills, not an image). */
export const ARCHITECTURE = Object.freeze([
  { label: "Vercel", role: "Frontend" },
  { label: "Render", role: "API" },
  { label: "MongoDB", role: "Metadata" },
  { label: "S3", role: "Files" },
  { label: "Gemini", role: "AI / embeddings" },
]);

/** Core demo flow shown on the landing page and mirrored in the workspace guide. */
export const DEMO_FLOW = Object.freeze([
  "Select a folder or document.",
  "Ask a question.",
  "Expand references.",
  "Generate a document from the chat.",
  "Download the generated file.",
]);

export const SAMPLE_QUESTIONS = Object.freeze([
  "What is Orchid Retail trying to improve?",
  "Which documents mention vendor onboarding?",
  "What are the rollout risks?",
  "What customer pain points relate to document search?",
  "Create a concise internal briefing from this chat.",
]);

/** Operation states for the processing status card. */
export const PROCESSING_STATES = Object.freeze([
  "Ready",
  "Starting backend",
  "Uploading",
  "Extracting",
  "Chunking",
  "Embedding",
  "Searching",
  "Generating answer",
  "Saving generated document",
  "Failed",
]);

/** Demo limits summary (label + value) for the landing page and usage card. */
export const DEMO_LIMITS_SUMMARY = Object.freeze([
  { label: "Session lifetime", value: "3 days" },
  { label: "Saved chats", value: "5" },
  { label: "AI prompts", value: "10" },
  { label: "Generated documents", value: "3" },
  { label: "Uploads", value: "5 (one at a time)" },
  { label: "User storage", value: "20 MB" },
]);
