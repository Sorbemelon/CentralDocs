# CentralDocs Mock Data Specification

## Story

The mock workspace is a fictional business scenario called Orchid Retail Digital Transformation. Orchid Retail is replacing scattered documents, spreadsheets, meeting notes, and support knowledge with CentralDocs.

All mock files must relate to the same story so semantic search, chat, references, and generated documents feel useful.

## Folders and files

1. Strategy & Rollout
   - CentralDocs Transformation Brief.md
   - Digital Workspace Rollout Plan.pptx
   - Intake-to-AI-Search Workflow.png

2. Document Operations
   - Document Management Policy.pdf
   - Remote Approval SOP.docx
   - Support Knowledge Playbook.tsv

3. Finance & Vendors
   - Vendor Onboarding Checklist.docx
   - Invoice Tracking Sample.xlsx
   - Expense Reimbursement Guide.pdf

4. Customer & Support Signals
   - Customer Feedback Export.csv
   - Support Ticket Summary.md

5. Meeting Evidence
   - Rollout Risk Discussion.mp3
   - Rollout Risk Discussion Transcript.md
   - Staff Training Demo.mp4
   - Staff Training Demo Notes.md

6. Generated Examples
   - Example Chat Summary.md

## File support demonstration

The mock data shows these file types:

- Markdown
- PDF
- DOCX
- XLSX
- PPTX
- CSV
- TSV
- PNG
- MP3
- MP4

Public upload remains limited to lightweight document/text types.

## Media indexing rule

Audio/video mock files are real files and downloadable. Their intended indexing path is direct Gemini multimodal embedding once during seeding, then cached vector use in the demo. Transcript/notes are included for fallback preview and user verification.

## Manifest

`backend/mock-data/manifest.json` should include file title, folder, filename, file kind, MIME type, source type, read-only flag, indexing mode, demo questions, expected topics, and relationships.
