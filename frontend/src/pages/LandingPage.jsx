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
  ListOrdered,
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
  { icon: FileText, label: "Document management", chip: "bg-primary/10 text-primary" },
  { icon: Search, label: "Semantic search", chip: "bg-teal-subtle text-teal-subtle-foreground" },
  { icon: MessagesSquare, label: "Chat with references", chip: "bg-success-subtle text-success-subtle-foreground" },
  { icon: Sparkles, label: "Generated documents", chip: "bg-primary/10 text-primary" },
];

/* Each stack node gets a unique, theme-consistent icon color. */
const ARCH_STYLE = {
  Frontend: { icon: Globe, chip: "bg-primary/10 text-primary" },
  API: { icon: Server, chip: "bg-teal-subtle text-teal-subtle-foreground" },
  "Vector search": { icon: Database, chip: "bg-success-subtle text-success-subtle-foreground" },
  Storage: { icon: HardDrive, chip: "bg-secondary text-primary" },
  AI: { icon: Sparkles, chip: "bg-primary text-primary-foreground" },
};

function SectionCard({ icon: Icon, title, children, className }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-3 shadow-md", className)}>
      <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold tracking-tight">
        {Icon && <Icon className="size-4 text-primary" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Compact one-viewport landing: big brand + hero + CTA on the left; an
 * Architecture card, Demo Flow, and compact Limits stacked on the right.
 * Desktop targets 100dvh; small screens stack and scroll naturally.
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
      <header className="shrink-0 border-b border-border/70 bg-card/70 backdrop-blur">
        <div className="mx-auto flex h-13 w-full max-w-6xl items-center gap-3 px-4">
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

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-8 lg:min-h-0 lg:overflow-y-auto lg:py-4">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10">
          {/* Hero */}
          <section className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-4">
              <span className="inline-flex size-20 items-center justify-center rounded-2xl border border-border bg-card shadow-md md:size-24">
                <img src={ICON_SRC} alt="CentralDocs logo" className="size-14 object-contain md:size-17" />
              </span>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                  Central<span className="text-wordmark">Docs</span>
                </h1>
                <p className="mt-1 text-base font-medium text-primary md:text-lg">{HERO.tagline}</p>
              </div>
            </div>

            <p className="max-w-[58ch] text-sm leading-relaxed text-muted-foreground md:text-[15px]">
              {HERO.description}
            </p>

            <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/70 p-2.5 shadow-sm">
                <Badge variant="muted" className="mb-1">Problem</Badge>
                <p className="text-[13px] font-medium leading-snug text-foreground">{PROBLEM_SOLUTION.problem.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                  {PROBLEM_SOLUTION.problem.body}
                </p>
              </div>
              <div className="rounded-lg border border-success/30 bg-success-subtle/70 p-2.5 shadow-sm">
                <Badge variant="success" className="mb-1">Solution</Badge>
                <p className="text-[13px] font-medium leading-snug text-foreground">{PROBLEM_SOLUTION.solution.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
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

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button size="lg" onClick={launchDemo} disabled={launching}>
                {launching ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Launch Demo Workspace
              </Button>
              <p className="text-xs text-muted-foreground">No account needed · anonymous 3-day demo session</p>
            </div>
          </section>

          {/* Architecture + Demo Flow + Limits */}
          <section className="flex flex-col gap-3">
            <SectionCard icon={Boxes} title="Architecture">
              <div className="flex flex-wrap items-center gap-1.5">
                {ARCHITECTURE.map((node, i) => {
                  const style = ARCH_STYLE[node.role] || ARCH_STYLE.Frontend;
                  const Icon = style.icon;
                  return (
                    <div key={node.label} className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 shadow-sm">
                        <span className={cn("inline-flex size-5.5 items-center justify-center rounded [&_svg]:size-3.5", style.chip)}>
                          <Icon />
                        </span>
                        <span className="text-[12px] font-medium leading-none">{node.label}</span>
                        <span className="text-[10px] leading-none text-muted-foreground">{node.role}</span>
                      </div>
                      {i < ARCHITECTURE.length - 1 && <span className="text-[11px] text-muted-foreground/70">→</span>}
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard icon={ListOrdered} title="Demo flow">
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
            </SectionCard>

            <div className="rounded-lg border border-border/70 bg-card/70 px-3 py-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Demo limits</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {DEMO_LIMITS_SUMMARY.map((l) => (
                  <span key={l.label} className="text-[11px] text-muted-foreground">
                    {l.label}: <span className="font-medium tabular-nums text-foreground">{l.value}</span>
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="shrink-0 border-t border-border/70">
        <div className="mx-auto flex h-10 w-full max-w-6xl items-center justify-between gap-2 px-4 text-xs text-muted-foreground">
          <span>Demo-first AI document workspace</span>
          <span className="truncate">React · Vite · Tailwind · Express · MongoDB · S3 · Gemini</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
