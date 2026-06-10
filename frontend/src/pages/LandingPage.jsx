import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowRight,
  Database,
  FileText,
  ListOrdered,
  Loader2,
  MessagesSquare,
  Search,
  Server,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { BackendStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBackendStatus } from "@/lib/useBackendStatus";
import {
  ARCHITECTURE,
  DEMO_FLOW,
  DEMO_LIMITS_SUMMARY,
  HERO,
  PROBLEM_SOLUTION,
  SAMPLE_QUESTIONS,
} from "@/data/demoCopy";
import { warmBackend } from "@/services/healthApi";
import { bootstrapDemo, createOrResumeSession } from "@/services/demoApi";

const CAPABILITIES = [
  { icon: FileText, label: "Document management" },
  { icon: Search, label: "Semantic search" },
  { icon: MessagesSquare, label: "Grounded chat with references" },
  { icon: Sparkles, label: "Generated documents" },
];

function ArchIcon({ role }) {
  const Icon =
    role === "Files" || role === "Metadata" ? Database : role === "API" ? Server : role === "Frontend" ? FileText : Sparkles;
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary [&_svg]:size-4">
      <Icon />
    </span>
  );
}

/**
 * Compact one-viewport landing: hero + CTA on the left, a tabbed info card
 * (Demo Flow / Architecture / Questions / Limits) on the right. Desktop fits
 * 100dvh; small screens stack and scroll naturally.
 */
function LandingPage() {
  const navigate = useNavigate();
  const { status } = useBackendStatus({ auto: true });
  const [launching, setLaunching] = useState(false);
  const [infoTab, setInfoTab] = useState("flow");

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
    <div className="flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh lg:overflow-hidden">
      <header className="shrink-0 border-b border-border bg-card/80">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <Logo size="sm" />
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
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          {/* Hero */}
          <section className="flex flex-col items-start gap-4">
            <BackendStatusBadge status={status} className="sm:hidden" />
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">{HERO.name}</h1>
              <p className="mt-2 text-lg font-medium text-primary">{HERO.tagline}</p>
              <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                {HERO.description}
              </p>
            </div>

            <div className="flex w-full max-w-md flex-col gap-1.5 rounded-lg border border-border bg-card p-3 text-[13px]">
              <p className="flex items-center gap-2">
                <Badge variant="muted" className="w-18 justify-center">Problem</Badge>
                <span className="min-w-0 truncate text-muted-foreground">{PROBLEM_SOLUTION.problem.title}</span>
              </p>
              <p className="flex items-center gap-2">
                <Badge variant="success" className="w-18 justify-center">Solution</Badge>
                <span className="min-w-0 truncate text-foreground">{PROBLEM_SOLUTION.solution.title}</span>
              </p>
            </div>

            <ul className="grid w-full max-w-md grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {CAPABILITIES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-[13px] text-foreground">
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-teal-subtle text-teal-subtle-foreground [&_svg]:size-3.5">
                    <Icon />
                  </span>
                  {label}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="lg" onClick={launchDemo} disabled={launching}>
                {launching ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Launch Demo Workspace
              </Button>
              <Button size="lg" variant="outline" onClick={() => setInfoTab("flow")}>
                View Demo Flow <ArrowRight />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No account needed · anonymous 3-day demo session · mock data included
            </p>
          </section>

          {/* Tabbed info card */}
          <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <Tabs value={infoTab} onValueChange={setInfoTab} className="gap-3">
              <TabsList className="w-full">
                <TabsTrigger value="flow" className="flex-1 justify-center px-2">Demo Flow</TabsTrigger>
                <TabsTrigger value="arch" className="flex-1 justify-center px-2">Architecture</TabsTrigger>
                <TabsTrigger value="questions" className="flex-1 justify-center px-2">Questions</TabsTrigger>
                <TabsTrigger value="limits" className="flex-1 justify-center px-2">Limits</TabsTrigger>
              </TabsList>

              <div className="min-h-76 px-1 pb-1">
                <TabsContent value="flow">
                  <p className="mb-2.5 text-xs text-muted-foreground">Five steps from sources to a downloadable document.</p>
                  <ol className="flex flex-col gap-2">
                    {DEMO_FLOW.map((step, i) => (
                      <li key={step} className="flex items-center gap-2.5 rounded-md border border-border bg-background px-2.5 py-2 text-sm">
                        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </TabsContent>

                <TabsContent value="arch">
                  <p className="mb-2.5 text-xs text-muted-foreground">A simple, deployable path from browser to AI.</p>
                  <div className="flex flex-col items-stretch gap-1">
                    {ARCHITECTURE.map((node, i) => (
                      <div key={node.label} className="flex flex-col items-center gap-1">
                        <div className="flex w-full items-center gap-2.5 rounded-md border border-border bg-background px-2.5 py-1.5">
                          <ArchIcon role={node.role} />
                          <p className="text-[13px] font-medium">{node.label}</p>
                          <p className="ml-auto text-[11px] text-muted-foreground">{node.role}</p>
                        </div>
                        {i < ARCHITECTURE.length - 1 && <ArrowDown className="size-3.5 text-muted-foreground/70" />}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="questions">
                  <p className="mb-2.5 text-xs text-muted-foreground">Try these against the built-in Orchid Retail demo documents.</p>
                  <div className="flex flex-col gap-1.5">
                    {SAMPLE_QUESTIONS.map((q) => (
                      <p key={q} className="rounded-md border border-border bg-background px-2.5 py-2 text-[13px] text-foreground">
                        {q}
                      </p>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="limits">
                  <p className="mb-2.5 text-xs text-muted-foreground">Each anonymous demo session is capped to keep the demo fair.</p>
                  <div className="flex flex-col gap-1">
                    {DEMO_LIMITS_SUMMARY.map((l) => (
                      <div key={l.label} className="flex items-center justify-between rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px]">
                        <span className="text-muted-foreground">{l.label}</span>
                        <span className="font-medium tabular-nums">{l.value}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </section>
        </div>
      </main>

      <footer className="shrink-0 border-t border-border">
        <div className="mx-auto flex h-11 w-full max-w-6xl items-center justify-between gap-2 px-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ListOrdered className="size-3.5" /> Demo project · Orchid Retail story
          </span>
          <span className="truncate">React · Vite · Tailwind · Express · MongoDB · S3 · Gemini</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
