# Product

## Register

product

## Users

Portfolio reviewers, recruiters, and engineers evaluating a demo-first AI document workspace. They arrive cold from a link, spend a few minutes, and need to understand the product and exercise the demo flow (attach → search → chat → generate → download) without instructions. Secondary user: the project author running live demos. Context: desktop-first, short sessions, anonymous demo accounts with hard limits.

## Product Purpose

CentralDocs centralizes documents for a fictional digital-transformation story (Orchid Retail): organize folders/documents, search them by semantic meaning, chat with selected sources with verifiable references, and turn useful conversations into downloadable generated documents. Success = a first-time visitor completes the demo loop and trusts what they see (grounded answers, visible references, honest status states).

## Brand Personality

Professional, grounded, compact. A polished document workspace, not a generic chatbot. Confidence comes from evidence (references, statuses, counts), never from AI theatrics. Voice is plain and specific; UI copy explains what will happen and why something is disabled.

## Anti-references

- AutumData's orange/autumn styling (legacy reference only; palette spirit professionalized, never copied).
- The generic purple-blue "AI gradient" SaaS look; sparkly chatbot hero pages.
- Cartoon robots / mascot AI styling.
- Long marketing landing pages; the landing is one compact intro screen, not a scroll story.
- Dashboard bloat: huge metric cards, giant upload dropzones, repeated guide content.

## Design Principles

1. **Evidence over claims** — references, statuses, and usage counters are the product's credibility; make them visible, compact, and honest (including offline/fallback states).
2. **One workspace, three zones** — sources (left), work surface (center tabs), supporting context (right). Each zone looks distinct; none competes with the center.
3. **Color means something** — teal = attach/context, emerald = ready/success, blue = primary action/active, red = destructive/failed, slate = structure. Never decorate every row.
4. **Compact but not cramped** — short rows, small dialogs, collapsed-by-default detail; density serves scanning, whitespace serves grouping.
5. **Degrade gracefully** — backend offline is a small helpful note plus demo data, never a scary blocker; every disabled control says why.

## Accessibility & Inclusion

Icon-only buttons carry aria-labels/tooltips; destructive actions confirm; dialogs have titles and Escape-close; disabled actions explain themselves via title/visible text; light default + dark mode via `.dark`; body text tuned ≥4.5:1 in both themes; respect `prefers-reduced-motion` for any non-trivial motion. No formal WCAG target declared; AA contrast is the working bar.
