# Design

## Theme

Professional document workspace. Light default; dark via `.dark` on `<html>` (persisted as `localStorage["centraldocs-theme"]`). All color tokens are OKLCH CSS variables in `frontend/src/styles/theme.css`, mapped to Tailwind v4 utilities via `@theme` in `frontend/src/styles/globals.css`. Color strategy: **Restrained** — slate-tinted neutral surfaces, deep document blue as primary, teal/emerald accents used only for meaning (attach/context, success).

## Color Palette

| Role | Token | Light | Notes |
|---|---|---|---|
| Background | `--background` | oklch(0.992 0.003 247) | App canvas |
| Card | `--card` | white | Elevated content surface |
| Primary | `--primary` | oklch(0.47 0.123 258) | Deep document blue; primary actions, active tab, focus ring |
| Teal | `--teal` (+`-subtle`) | oklch(0.58 0.082 207) | Attach/context/informational; right-panel support accents |
| Success | `--success` (+`-subtle`) | oklch(0.6 0.13 157) | Emerald; Ready/Generated states |
| Warning | `--warning` (+`-subtle`) | amber | Functional warnings only (never autumn branding) |
| Destructive | `--destructive` (+`-subtle`) | oklch(0.577 0.21 27) | Delete/Failed |
| Sidebar | `--sidebar*` | cooler slate layer | Second neutral layer for left sidebar/panels |
| Muted/secondary/accent | slate tints | | Hover/active surfaces, metadata text |

Anti-rules: no orange/autumn branding, no purple-blue AI gradient, no gradient text, no side-stripe accent borders (use full borders + background tints instead).

## Typography

System sans stack (Tailwind default), one family. Product scale: compact fixed rem sizes — section headers `text-sm font-semibold tracking-tight`, row titles `text-[13px] font-medium`, metadata `text-[11px]`/`text-[10px] uppercase tracking-wide text-muted-foreground`, body `text-sm`. Tabular numerals (`tabular-nums`) for counts.

## Components

Radix-free shadcn-style primitives in `frontend/src/components/ui/` (CVA + clsx + tailwind-merge): Button (default/secondary/outline/ghost/teal/success/destructive/link; xs→lg + icon sizes), Badge (muted/outline/teal/success/warning/destructive variants), Card, Alert (info/success/warning/destructive subtle tints), Tabs, Accordion (native details-style), Dialog (+ ConfirmDialog/PromptDialog/ChoiceDialog, all `max-w-sm`), DropdownMenu (click-away/Esc), Input, Textarea, Tooltip, ScrollArea, Skeleton, Progress, Separator. Common wrappers: IconButton (aria-label + tooltip), StatusBadge (backend/doc states), LimitBadge, Loading/Empty/ErrorState, Logo, ThemeToggle.

## Layout

One workspace route, three zones: left `SourceSidebar` (Sources above Chat Sessions; cooler `--sidebar` surface), center `MainWorkspacePanel` (tabs: Chat/Search/Preview/Generated; primary work surface on `--background`/`--card`), right `RightContextPanel` (collapsible support cards; quiet supporting surface). Top bar ~54px with session/status/usage chips. Below `md` Sources becomes a drawer; below `xl` the context panel becomes a drawer. Rows are compact (py-1.5); dialogs small; detail collapsed by default.

## Iconography

lucide-react, `size-4` default (`size-3.5`/`size-3` in dense rows). Meaningful icon colors: Plus(attach)=teal/primary, Minus(remove)=slate, Trash2=destructive, Download=slate/blue, RefreshCw(retry)=teal, ready=emerald, failed=destructive. Never a check/tick icon for attach.
