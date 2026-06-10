import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowDown,
  Boxes,
  Database,
  FileText,
  Globe,
  HardDrive,
  HelpCircle,
  Loader2,
  MessagesSquare,
  Search,
  Server,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { BackendStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useBackendStatus } from "@/lib/useBackendStatus";
import { ARCHITECTURE, DEMO_FLOW_DETAILS, DEMO_LIMITS_SUMMARY, HERO, PROBLEM_SOLUTION } from "@/data/demoCopy";
import { warmBackend } from "@/services/healthApi";
import { bootstrapDemo, createOrResumeSession } from "@/services/demoApi";

const ICON_SRC = "/brand/centraldocs_icon_light_transparent.png";

const FEATURES = [
  { icon: FileText, label: "Document management", chip: "bg-primary/12 text-primary" },
  { icon: Search, label: "Semantic search", chip: "bg-teal-subtle text-teal-subtle-foreground" },
  { icon: MessagesSquare, label: "Chat with references", chip: "bg-success-subtle text-success-subtle-foreground" },
  { icon: Sparkles, label: "Generated documents", chip: "bg-wordmark/15 text-wordmark" },
];

/* Stack-identity colors: each architecture node owns a recognizable accent
   (S3 amber is stack identity, not autumn branding). Dark-readable pairs. */
const ARCH_STYLE = {
  Frontend: {
    icon: Globe,
    chip: "bg-foreground text-background",
    frame: "border-foreground/25 bg-card",
    text: "text-foreground",
  },
  API: {
    icon: Server,
    chip: "bg-[#6366f1]/15 text-[#4f46e5] dark:text-[#a5b4fc]",
    frame: "border-[#6366f1]/40 bg-card",
    text: "text-[#4f46e5] dark:text-[#a5b4fc]",
  },
  "Vector search": {
    icon: Database,
    chip: "bg-[#10a55a]/14 text-[#0e7a44] dark:text-[#4ade80]",
    frame: "border-[#10a55a]/45 bg-card",
    text: "text-[#0e7a44] dark:text-[#4ade80]",
  },
  Storage: {
    icon: HardDrive,
    chip: "bg-[#f59e0b]/16 text-[#9a5b06] dark:text-[#fbbf24]",
    frame: "border-[#f59e0b]/45 bg-card",
    text: "text-[#9a5b06] dark:text-[#fbbf24]",
  },
  AI: {
    icon: Sparkles,
    chip: "bg-primary text-primary-foreground",
    frame: "border-primary/45 bg-card",
    text: "text-primary",
  },
};

/**
 * Compact three-row landing: brand row, content row (hero/cards left, "How to
 * use?" right), and a full-width architecture row. Desktop targets ~100dvh;
 * small screens stack and scroll naturally.
 */
function LandingPage() {
  const navigate = useNavigate();
  const { status } = useBackendStatus({ auto: true });
  const [launching, setLaunching] = useState(false);

  // Best-effort warm/session/bootstrap, then enter the workspace either way.
  const launchDemo = async () => {
    setLaunching(true);
    try {
      await warmBackend();
    } catch {
      /* warm is best-effort */
    }
    try {
      await createOrResumeSession();
      await bootstrapDemo();
    } catch {
      toast("Starting in offline mode", {
        description: "The backend is cold or unavailable; the workspace will show demo data.",
      });
    }
    setLaunching(false);
    navigate("/workspace");
  };

  return (
    <div className="landing-bg flex min-h-dvh flex-col text-foreground lg:h-dvh lg:overflow-hidden">
      <header className="shrink-0 border-b border-border/60 bg-card/70 backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center gap-3 px-4">
          <span className="inline-flex items-center gap-2">
            <img src={ICON_SRC} alt="" aria-hidden="true" className="size-6 object-contain" />
            <span className="text-sm font-semibold tracking-tight">
              Central<span className="text-wordmark">Docs</span>
            </span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <BackendStatusBadge status={status} className="hidden sm:inline-flex" />
            <ThemeToggle />
            <Button size="sm" onClick={launchDemo} disabled={launching}>
              {launching ? <Loader2 className="animate-spin" /> : null}
              Launch Demo
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-5 px-4 py-6 lg:min-h-0 lg:overflow-y-auto lg:py-4">
        {/* Row 1 — brand */}
        <section className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-4">
            <span className="inline-flex size-18 items-center justify-center rounded-2xl border border-border bg-card shadow-md md:size-20">
              <img src={ICON_SRC} alt="CentralDocs logo" className="size-13 object-contain md:size-15" />
            </span>
            <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
              Central<span className="text-wordmark">Docs</span>
            </h1>
          </div>
          <p className="text-base font-medium text-primary md:text-lg">{HERO.tagline}</p>
        </section>

        {/* Row 2 — content */}
        <section className="grid w-full items-start gap-6 lg:grid-cols-[1.04fr_0.96fr] lg:gap-8">
          <div className="flex flex-col items-start gap-3">
            <p className="max-w-[60ch] text-[15px] font-medium leading-relaxed text-foreground">{HERO.description}</p>

            <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-warning/45 bg-warning-subtle/80 p-2.5 shadow-sm">
                <Badge variant="warning" className="mb-1">Problem</Badge>
                <p className="text-[13px] font-medium leading-snug text-foreground">{PROBLEM_SOLUTION.problem.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-warning-subtle-foreground">
                  {PROBLEM_SOLUTION.problem.body}
                </p>
              </div>
              <div className="rounded-lg border border-success/45 bg-success-subtle/80 p-2.5 shadow-sm">
                <Badge variant="success" className="mb-1">Solution</Badge>
                <p className="text-[13px] font-medium leading-snug text-foreground">{PROBLEM_SOLUTION.solution.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-success-subtle-foreground">
                  {PROBLEM_SOLUTION.solution.body}
                </p>
              </div>
            </div>

            <ul className="grid w-full max-w-xl grid-cols-1 gap-1.5 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, label, chip }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-[13px] font-medium text-foreground shadow-sm"
                >
                  <span className={cn("inline-flex size-6.5 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5", chip)}>
                    <Icon />
                  </span>
                  {label}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <Button size="lg" onClick={launchDemo} disabled={launching}>
                {launching ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Launch Demo Workspace
              </Button>
              <p className="text-xs text-muted-foreground">No account needed · anonymous 3-day demo session</p>
            </div>

            <div className="w-full max-w-xl rounded-lg border border-border bg-card/80 px-3 py-2 shadow-sm">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Demo limits</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {DEMO_LIMITS_SUMMARY.map((l) => (
                  <span key={l.label} className="text-[11px] text-muted-foreground">
                    {l.label}: <span className="font-medium tabular-nums text-foreground">{l.value}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-teal/35 bg-card p-3.5 shadow-md">
            <h2 className="mb-2.5 flex items-center gap-2 text-lg font-semibold tracking-tight">
              <span className="inline-flex size-7 items-center justify-center rounded-md bg-teal text-teal-foreground">
                <HelpCircle className="size-4" />
              </span>
              How to use?
            </h2>
            <ol className="flex flex-col">
              {DEMO_FLOW_DETAILS.map((item, i) => (
                <li key={item.step} className="flex flex-col">
                  <div className="flex items-start gap-2.5 rounded-md border border-border bg-background px-2.5 py-1.5 shadow-sm">
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium leading-tight">{item.step}</p>
                      <p className="text-[11px] leading-snug text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                  {i < DEMO_FLOW_DETAILS.length - 1 && (
                    <ArrowDown className="mx-auto my-0.5 size-3.5 shrink-0 text-teal" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Row 3 — architecture */}
        <section className="rounded-xl border border-border bg-card p-3 shadow-md">
          <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold tracking-tight">
            <Boxes className="size-4 text-primary" />
            Architecture
          </h2>
          <div className="flex flex-col items-stretch gap-1.5 lg:flex-row lg:flex-nowrap lg:items-center">
            {ARCHITECTURE.map((node, i) => {
              const style = ARCH_STYLE[node.role] || ARCH_STYLE.Frontend;
              const Icon = style.icon;
              return (
                <div key={node.label} className="flex flex-col items-center gap-1.5 lg:min-w-0 lg:flex-1 lg:flex-row">
                  <div
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 shadow-sm lg:min-w-0",
                      style.frame,
                    )}
                  >
                    <span className={cn("inline-flex size-6.5 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", style.chip)}>
                      <Icon />
                    </span>
                    <div className="min-w-0">
                      <p className={cn("truncate text-[13px] font-semibold leading-tight", style.text)}>{node.label}</p>
                      <p className="truncate text-[10px] leading-tight text-muted-foreground">{node.role}</p>
                    </div>
                  </div>
                  {i < ARCHITECTURE.length - 1 && (
                    <span className="shrink-0 text-muted-foreground/70">
                      <ArrowDown className="size-3.5 lg:hidden" />
                      <span className="hidden text-[12px] lg:inline">→</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="shrink-0 border-t border-border/60">
        <div className="mx-auto flex h-10 w-full max-w-6xl items-center justify-between gap-2 px-4 text-xs text-muted-foreground">
          <span>Demo AI project</span>
          <span className="truncate">React · Vite · Tailwind · Express · MongoDB · S3 · Gemini</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
