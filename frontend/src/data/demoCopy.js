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
  { label: "MongoDB", role: "Vector search" },
  { label: "S3", role: "Storage" },
  { label: "Gemini", role: "AI" },
]);

/** Core demo flow shown on the landing page and mirrored in the workspace guide. */
export const DEMO_FLOW = Object.freeze([
  "Select a folder or document.",
  "Ask a question.",
  "Expand references.",
  "Generate a document from the chat.",
  "Download the generated file.",
]);

/** Landing demo-flow steps with a one-line explanation each. */
export const DEMO_FLOW_DETAILS = Object.freeze([
  { step: "Select sources", detail: "Tick folders or documents to build the chat context." },
  { step: "Ask a question", detail: "The AI answers only from what you selected." },
  { step: "Expand references", detail: "Every answer cites the exact passages it used." },
  { step: "Generate a document", detail: "Turn a useful chat into a saved .md or .txt file." },
  { step: "Download the file", detail: "Generated documents are normal, reusable sources." },
]);

/** Exactly three mock-corpus prompts shared by the right guide and new-chat empty state. */
export const GUIDE_QUESTIONS = Object.freeze([
  {
    text: "What are the main rollout risks?",
    documentIds: [
      "mock_document_01_strategy_rollout_centraldocs_transformation_brief_md",
      "mock_document_01_strategy_rollout_digital_workspace_rollout_plan_pptx",
      "mock_document_05_meeting_evidence_rollout_risk_discussion_mp3",
      "mock_document_05_meeting_evidence_rollout_risk_discussion_transcript_md",
    ],
    documentTitles: [
      "CentralDocs Transformation Brief",
      "Digital Workspace Rollout Plan",
      "Rollout Risk Discussion",
      "Rollout Risk Discussion Transcript",
    ],
  },
  {
    text: "Why are support teams having trouble finding answers?",
    documentIds: [
      "mock_document_04_customer_support_signals_customer_feedback_export_csv",
      "mock_document_04_customer_support_signals_support_ticket_summary_md",
      "mock_document_02_document_operations_support_knowledge_playbook_tsv",
    ],
    documentTitles: [
      "Customer Feedback Export",
      "Support Ticket Summary",
      "Support Knowledge Playbook",
    ],
  },
  {
    text: "What approval steps are required?",
    documentIds: [
      "mock_document_02_document_operations_document_management_policy_pdf",
      "mock_document_02_document_operations_remote_approval_sop_docx",
      "mock_document_03_finance_vendors_vendor_onboarding_checklist_docx",
      "mock_document_03_finance_vendors_invoice_tracking_sample_xlsx",
      "mock_document_03_finance_vendors_expense_reimbursement_guide_pdf",
    ],
    documentTitles: [
      "Document Management Policy",
      "Remote Approval SOP",
      "Vendor Onboarding Checklist",
      "Invoice Tracking Sample",
      "Expense Reimbursement Guide",
    ],
  },
]);

export const SAMPLE_QUESTIONS = Object.freeze([
  "What is Orchid Retail trying to improve?",
  "Which documents mention vendor onboarding?",
  "What are the rollout risks?",
  "What customer pain points relate to document search?",
  "Create a concise internal briefing from this chat.",
]);

/** Sample questions surfaced in the Chat tab's empty state. */
export const CHAT_SAMPLE_QUESTIONS = GUIDE_QUESTIONS;

/** Generate Document modal defaults. */
export const GENERATED_DEFAULT_FILENAME = "summary.md";

export const GENERATED_INSTRUCTION_PLACEHOLDER =
  "Optional: write a concise internal briefing with background, findings, risks, decisions, next steps, and references.";

/** Cosmetic generation steps (backend answers in one request). */
export const GENERATED_DOC_STEPS = Object.freeze([
  "Preparing chat context",
  "Generating document",
  "Saving document",
  "Indexing document",
]);

/** Clear Session confirmation copy (uploads/generated/chats/user folders cleared; mock remains). */
export const CLEAR_SESSION_DIALOG = Object.freeze({
  title: "Clear this demo session?",
  description:
    "This removes uploaded files, generated documents, saved chats, and user-created folders for this session. Mock demo documents will remain.",
  confirmLabel: "Clear session",
});

/** Compact delete-confirmation copy (soft-delete; restorable from Trash). */
export const DELETE_CONFIRM = Object.freeze({
  document: (title) => ({
    title: "Delete this document?",
    description: `"${title}" moves to Trash. You can restore it while the session is active.`,
    confirmLabel: "Delete",
  }),
  folder: (name) => ({
    title: "Delete this folder?",
    description: `"${name}" moves to Trash. Its documents stay in your session and can be restored.`,
    confirmLabel: "Delete",
  }),
  chat: (title) => ({
    title: "Delete this chat?",
    description: `"${title}" will be removed from your saved chats.`,
    confirmLabel: "Delete",
  }),
});

/** Sample questions surfaced in the semantic Search tab's empty state. */
export const SEARCH_SAMPLE_QUESTIONS = Object.freeze([
  "What is Orchid Retail trying to improve?",
  "Which documents mention vendor onboarding?",
  "What are the rollout risks?",
  "What customer pain points relate to document search?",
  "Which policy explains document storage and approval?",
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

/** Upload card copy. Allowed public types and per-type size caps. */
export const UPLOAD_COPY = Object.freeze({
  allowed: "txt, md, csv, tsv, pdf, docx",
  sizeCaps: "txt/md/csv/tsv ≤ 500 KB · docx ≤ 1 MB · pdf ≤ 2 MB",
  unsupported: "That file type isn't supported. Allowed: txt, md, csv, tsv, pdf, docx.",
});

/** Demo limits summary (label + value) for the landing page and usage card. */
export const DEMO_LIMITS_SUMMARY = Object.freeze([
  { label: "Session lifetime", value: "3 days" },
  { label: "Saved chats", value: "5" },
  { label: "AI prompts", value: "10" },
  { label: "Generated documents", value: "3" },
  { label: "Uploads", value: "5 (one at a time)" },
  { label: "User storage", value: "20 MB" },
]);
