// Offline fallback workspace data for Phase 7A.
//
// Mirrors the Orchid Retail Digital Transformation story from
// CENTRALDOCS_MOCK_DATA_SPEC.md so the workspace renders (and the
// plus/minus/delete interactions are visible) even when the backend is cold.
//
// Mock items are read-only. User/generated items expose delete affordances
// for future soft-delete wiring.

import { DOC_STATUS, SOURCE_KIND } from "@/lib/constants";

/** Folders: read-only demo folders for local/offline fallback. */
export const FALLBACK_FOLDERS = [
  { id: "fld-strategy", name: "Strategy & Rollout", source: SOURCE_KIND.mock, readOnly: true, group: "demo" },
  { id: "fld-docops", name: "Document Operations", source: SOURCE_KIND.mock, readOnly: true, group: "demo" },
  { id: "fld-finance", name: "Finance & Vendors", source: SOURCE_KIND.mock, readOnly: true, group: "demo" },
  { id: "fld-signals", name: "Customer & Support Signals", source: SOURCE_KIND.mock, readOnly: true, group: "demo" },
  { id: "fld-meetings", name: "Meeting Evidence", source: SOURCE_KIND.mock, readOnly: true, group: "demo" },
  { id: "fld-generated", name: "Generated Examples", source: SOURCE_KIND.mock, readOnly: true, group: "demo" },
];

/** Documents across the story. type is a short display badge. */
export const FALLBACK_DOCUMENTS = [
  { id: "doc-brief", title: "CentralDocs Transformation Brief", type: "MD", folderId: "fld-strategy", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Orchid Retail aims to replace scattered documents with one searchable, AI-grounded workspace." },
  { id: "doc-rollout", title: "Digital Workspace Rollout Plan", type: "PPTX", folderId: "fld-strategy", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Phased rollout across operations, finance, and support with risk checkpoints." },
  { id: "doc-workflow", title: "Intake-to-AI-Search Workflow", type: "PNG", folderId: "fld-strategy", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Diagram: document intake through extraction, chunking, embedding, and search." },

  { id: "doc-policy", title: "Document Management Policy", type: "PDF", folderId: "fld-docops", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Retention, access, and approval rules for managed documents." },
  { id: "doc-sop", title: "Remote Approval SOP", type: "DOCX", folderId: "fld-docops", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Standard operating procedure for remote approvals." },
  { id: "doc-playbook", title: "Support Knowledge Playbook", type: "TSV", folderId: "fld-docops", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Tabular knowledge base of support resolutions." },

  { id: "doc-vendor", title: "Vendor Onboarding Checklist", type: "DOCX", folderId: "fld-finance", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Steps and approvals required to onboard a new vendor." },
  { id: "doc-invoice", title: "Invoice Tracking Sample", type: "XLSX", folderId: "fld-finance", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Sample invoice tracking spreadsheet with statuses." },
  { id: "doc-expense", title: "Expense Reimbursement Guide", type: "PDF", folderId: "fld-finance", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Guidance for submitting and approving expense reimbursements." },

  { id: "doc-feedback", title: "Customer Feedback Export", type: "CSV", folderId: "fld-signals", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Exported customer feedback rows highlighting search and access pain points." },
  { id: "doc-tickets", title: "Support Ticket Summary", type: "MD", folderId: "fld-signals", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Summary of recurring support tickets related to finding documents." },

  { id: "doc-risk-audio", title: "Rollout Risk Discussion", type: "MP3", folderId: "fld-meetings", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Recorded discussion of rollout risks (multimodal indexed)." },
  { id: "doc-risk-transcript", title: "Rollout Risk Discussion Transcript", type: "MD", folderId: "fld-meetings", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Transcript fallback for the rollout risk discussion." },
  { id: "doc-training-video", title: "Staff Training Demo", type: "MP4", folderId: "fld-meetings", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Recorded staff training walkthrough." },

  { id: "doc-example-summary", title: "Example Chat Summary", type: "MD", folderId: "fld-generated", source: SOURCE_KIND.mock, status: DOC_STATUS.ready, readOnly: true, excerpt: "Example of a generated chat summary document (read-only sample)." },

];

/** Soft-deleted placeholders for the Trash filter (user/generated only; never mock). */
export const FALLBACK_TRASH = [
  { id: "trash-doc-1", title: "Old Vendor Draft", type: "DOCX", source: SOURCE_KIND.uploaded, kind: "document", deletedAt: "2 days ago" },
  { id: "trash-fld-1", title: "Old Experiments", type: "FOLDER", source: SOURCE_KIND.uploaded, kind: "folder", deletedAt: "1 day ago" },
];

/** Generated documents list for the Generated tab. */
export const FALLBACK_GENERATED = [
];

/** Usage counters (display-only). */
export const FALLBACK_USAGE = {
  uploads: { used: 0, limit: 5 },
  chats: { used: 0, limit: 5 },
  prompts: { used: 0, limit: 10 },
  generated: { used: 0, limit: 3 },
  folders: { used: 0, limit: 10 },
  storageMb: { used: 0, limit: 20 },
};
