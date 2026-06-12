# CentralDocs UX Specification

## Visual direction

CentralDocs should feel like a compact, professional document workspace rather than a generic AI landing page. The visual system uses document blue, teal/emerald action color, neutral slate surfaces, clear file tags, and restrained theme-aware gradients.

The default theme is light, with dark mode available. The landing page uses a brand-forward gradient background. The workspace favors dense, scannable controls, stable panel dimensions, and direct document actions.

## Design principles

- Evidence over claims: references, statuses, usage counters, and ready/failed states are credibility surfaces.
- One workspace, three zones: sources on the left, work surface in the center, supporting context on the right.
- Color means something: blue for primary/active actions, teal for context/attach and informational support, emerald for ready/success, red for destructive/failed, and slate for structure.
- Compact but not cramped: short rows, small dialogs, collapsed details, and enough spacing to make groups legible.
- Degrade gracefully: backend offline or provider unavailable states should be clear and calm, not hidden behind fake success.

## Theme and tokens

The frontend theme uses CSS variables in `frontend/src/styles/theme.css` and maps them into Tailwind utilities in `frontend/src/styles/globals.css`. The app toggles dark mode with `.dark` on `<html>` and persists the user choice in local storage.

Theme guidance:

- Use slate-tinted neutral surfaces for the workspace.
- Use deep document blue for primary actions, active tabs, and focus surfaces.
- Use teal for attach/context/informational controls.
- Use emerald for ready/generated/success states.
- Use amber only for functional warnings.
- Use destructive red for delete and failed states.
- Avoid orange/autumn branding and decorative AI gradients.
- Avoid gradient text and ornamental accent stripes.

## Typography and density

Use the system sans stack. Keep type compact and readable:

- section headers: small, semibold, tight tracking.
- row titles: compact medium weight.
- metadata: small muted text with tabular numerals for counts.
- body copy: normal small text.

Do not use hero-scale type inside compact panels, sidebars, rows, cards, or dialogs.

## Landing page

The landing page is compact and should immediately show CentralDocs as the product.

Required landing behavior:

- Big logo and split CentralDocs wordmark.
- CTA says Launch Demo Workspace when there is no valid active session.
- CTA says Continue Workspace or Continue Demo when a valid session exists.
- Dense three-row design with a How to use flow, Architecture row, compact demo limits, and one main CTA.
- Footer uses the Demo AI project identity.
- No landing Questions section.
- No separate feature-page navigation for Documents, Search, Chat, Generated Documents, or Guide.

## Workspace shell

The workspace is a single `/workspace` route with internal tabs and panels.

Required layout:

- Top bar with larger brand mark/name, backend status, session state, theme toggle, and no limit badges.
- Left sidebar with Upload File at the top.
- Sources above Chat Sessions.
- Chat Sessions collapsible below Sources.
- Center tabs: Chat, Search, Preview, Generated.
- Right sidebar contains only Current Selected Context, Demo Guide, and Usage.
- Backend status appears only in the top bar.
- References live under assistant answers, not in the right sidebar.
- Processing-status cards are not rendered in the right sidebar.

Responsive behavior:

- Below medium widths, Sources can move into a drawer.
- Below extra-large widths, the right context panel can move into a drawer.
- Dropdowns, tooltips, and dialogs should render above scrollable panels and avoid clipping.

## Source tree

Sources are nested and compact.

Source selection rules:

- The attach/select control is a tick/check before the folder or file icon.
- Plus/add icons are reserved for New Chat or Add Folder actions.
- Ticking a folder visually selects descendant folders and files.
- If a collapsed folder contains selected descendants but is not fully selected, show a partial state such as a small dot in the tick box.
- Removing a parent folder selection should remove its descendant selected files/folders from the current context.
- Each eligible folder can show an add-subfolder action.
- Mock folders and documents are read-only for management actions.
- User and generated documents/folders expose management actions where appropriate.
- File names show their extensions.
- Long names can wrap after click/toggle so users can inspect the full name.
- File-extension tags use distinct colors.

The current canonical selection icon is tick/check. Older local design notes that used plus as attach are superseded by this rule.

## Upload card

The Upload File card stays at the top of the left sidebar. Before a file is selected, the button shows a clip icon with Browse. After a file is selected, the selected-file state can show the current upload action.

Public upload stays one file at a time and validates type and size before sending. Backend validation remains authoritative.

## Current Selected Context

The right sidebar section title remains Current Selected Context.

Required behavior:

- Show exact selected document and folder names.
- Show nested folder contents where useful.
- Use a Remove text action rather than a minus icon.
- Do not collapse selected context into only a number after chat send.
- Preserve selected context after sending a prompt.
- Do not expose storage keys, embeddings, local paths, or provider internals.

## Chat UX

There is no fake initial chat history. If the live backend has no chats, the chat area shows an empty state with a New Chat button. Offline fallback may show an empty local chat shell and sample questions, but not fake assistant messages.

Required chat behavior:

- Chat input is controlled, editable, and sticky at the bottom.
- User message appears immediately after submit.
- Input and submit are disabled while an accepted prompt is generating.
- The submit button does not need to switch to a loading icon.
- Selected documents/folders are sent with the prompt and preserved after the answer.
- Provider failures should show a safe error toast and should not create a fake failed assistant reply.
- Assistant answers render safe Markdown, including paragraphs, lists, bold, inline code, code blocks, blockquotes, and tables when supported.
- References used appear under assistant answers, collapsed by default.
- Reference display dedupes by source/chunk, supports citation lists and ranges, and does not show model, latency, token, or provider metadata.
- Suggested questions are short, easy to understand, and can select associated mock files while clearing unrelated selections.

## Search UX

Search supports semantic query input with scope controls for current context, all demo docs, uploaded docs, and generated docs. Results show source metadata, locator/excerpt, and actions to preview or attach. Asking from search should prefill chat draft or move the user toward Chat without auto-sending.

## Preview UX

Preview should show multi-line extracted or generated content where available, not a single summary line. It must be safe for mock, uploaded, and generated documents and must not expose raw object keys or internal file paths.

## Generate Document UX

Generated documents are created from explicit Generate Document actions, not chat commands.

Required behavior:

- The instruction field is optional.
- Empty instruction uses the backend default summary behavior.
- Filename defaults to `summary.md`, with a numbered suffix when that name already exists.
- Generated documents are stored as normal documents and also appear in the Generated tab.
- Generated documents can be previewed, downloaded, attached, and searched when ready.

## Fallback and degraded states

The UI keeps local/offline fallback for development, but it must be visibly distinct from live backend success. Fallback data should not hide a real backend failure. Actions requiring the backend or providers should give clear disabled reasons or safe error messages.

## Components and controls

Use local shadcn-style primitives and lucide icons where available:

- icon buttons require aria labels or tooltips.
- destructive actions require confirmation.
- dialogs need titles and Escape-close behavior.
- disabled actions need a visible reason or title.
- small dense controls should remain pointer-clickable where they trigger actions.
- cards should frame repeated items or true panels, not nest page sections inside page sections.

## Accessibility

CentralDocs should target practical accessibility for a portfolio demo:

- Icon-only buttons need accessible labels.
- Hover-only actions should remain discoverable enough for keyboard or pointer users.
- Text contrast should be strong in light and dark themes.
- Form fields should have clear labels or context.
- Error and disabled states should explain what changed and what the user can do.
- Respect reduced-motion preferences for non-trivial motion.
