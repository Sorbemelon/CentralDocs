import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  Database,
  FileText,
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
import { Separator } from "@/components/ui/separator";
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

const CAPABILITY_ICONS = [FileText, Search, MessagesSquare, Sparkles];

function NavLinkA({ href, children }) {
  return (
    <a href={href} className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline">
      {children}
    </a>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  const { status, check } = useBackendStatus({ auto: true });
  const [launching, setLaunching] = useState(false);

  // Best-effort warm/session/bootstrap, then enter the workspace either way.
  const launchDemo = async () => {
    setLaunching(true);
    try {
      await check({ warm: true });
    } catch {
      /* ignore */
    }
    try {
      await warmBackend();
    } catch {
      /* ignore */
    }
    try {
      await createOrResumeSession();
    } catch {
      /* ignore */
    }
    try {
      await bootstrapDemo();
    } catch {
      toast("Starting in offline mode", {
        description: "The backend is cold or unavailable; the workspace shell will still load.",
      });
    }
    setLaunching(false);
    navigate("/workspace");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Logo size="sm" />
          <nav className="ml-auto flex items-center gap-4">
            <NavLinkA href="#project">Project</NavLinkA>
            <NavLinkA href="#architecture">Architecture</NavLinkA>
            <NavLinkA href="#guide">Demo Guide</NavLinkA>
            <ThemeToggle />
            <Button size="sm" onClick={launchDemo} disabled={launching}>
              {launching ? <Loader2 className="animate-spin" /> : null}
              Launch Demo
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        {/* Hero */}
        <section className="flex flex-col items-start gap-4 py-12 md:py-16">
          <BackendStatusBadge status={status} />
          <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">{HERO.name}</h1>
          <p className="text-lg font-medium text-primary md:text-xl">{HERO.tagline}</p>
          <p className="max-w-[60ch] text-sm text-muted-foreground md:text-base">{HERO.description}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="lg" onClick={launchDemo} disabled={launching}>
              {launching ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Launch Demo Workspace
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("guide")?.scrollIntoView({ behavior: "smooth" })}
            >
              View Demo Flow <ArrowRight />
            </Button>
          </div>
        </section>

        <Separator />

        {/* Problem / Solution */}
        <section id="project" className="grid gap-4 py-10 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <Badge variant="muted" className="mb-2">Problem</Badge>
            <h2 className="text-base font-semibold">{PROBLEM_SOLUTION.problem.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{PROBLEM_SOLUTION.problem.body}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <Badge variant="success" className="mb-2">Solution</Badge>
            <h2 className="text-base font-semibold">{PROBLEM_SOLUTION.solution.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{PROBLEM_SOLUTION.solution.body}</p>
          </div>
        </section>

        {/* Capabilities */}
        <section className="grid gap-3 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Document management", d: "Folders, types, statuses, and trash in one compact panel." },
            { t: "Semantic search", d: "Find by meaning across selected sources, not just keywords." },
            { t: "Grounded chat", d: "Answers cite the documents you attached, with references." },
            { t: "Generated documents", d: "Turn a useful chat into a downloadable document." },
          ].map((c, i) => {
            const Icon = CAPABILITY_ICONS[i];
            return (
              <div key={c.t} className="rounded-lg border border-border bg-card p-3">
                <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary [&_svg]:size-4">
                  <Icon />
                </span>
                <h3 className="mt-2 text-sm font-semibold">{c.t}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.d}</p>
              </div>
            );
          })}
        </section>

        <Separator />

        {/* Architecture */}
        <section id="architecture" className="py-10">
          <h2 className="text-base font-semibold">Architecture</h2>
          <p className="mt-1 text-sm text-muted-foreground">A simple, deployable path from browser to AI.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {ARCHITECTURE.map((node, i) => (
              <div key={node.label} className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                  <ArchIcon role={node.role} />
                  <div>
                    <p className="text-[13px] font-medium leading-tight">{node.label}</p>
                    <p className="text-[11px] text-muted-foreground">{node.role}</p>
                  </div>
                </div>
                {i < ARCHITECTURE.length - 1 && <ArrowRight className="size-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Demo guide + sample questions */}
        <section id="guide" className="grid gap-6 py-10 md:grid-cols-2">
          <div>
            <h2 className="text-base font-semibold">Core demo flow</h2>
            <ol className="mt-3 flex flex-col gap-2">
              {DEMO_FLOW.map((step, i) => (
                <li key={step} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-base font-semibold">Sample questions</h2>
            <div className="mt-3 flex flex-col gap-1.5">
              {SAMPLE_QUESTIONS.map((q) => (
                <div key={q} className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                  {q}
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator />

        {/* Demo limits */}
        <section className="py-10">
          <h2 className="text-base font-semibold">Demo limits</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEMO_LIMITS_SUMMARY.map((l) => (
              <div key={l.label} className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{l.label}</p>
                <p className="text-sm font-semibold tabular-nums">{l.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA footer */}
        <section className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-4 py-10 text-center">
          <h2 className="text-xl font-semibold">Explore the workspace</h2>
          <p className="max-w-[48ch] text-sm text-muted-foreground">
            No account needed. Launch the demo and try documents, search, grounded chat, and generated documents.
          </p>
          <Button size="lg" onClick={launchDemo} disabled={launching}>
            {launching ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Launch Demo Workspace
          </Button>
        </section>

        <footer className="flex items-center justify-between gap-2 py-6 text-xs text-muted-foreground">
          <Logo size="sm" withName />
          <span>Tech: React · Vite · Tailwind · Express · MongoDB · S3 · Gemini</span>
        </footer>
      </main>
    </div>
  );
}

function ArchIcon({ role }) {
  const Icon = role === "Files" ? Database : role === "Metadata" ? Database : role === "API" ? Server : role === "AI / embeddings" ? Sparkles : FileText;
  return (
    <span className="inline-flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
      <Icon />
    </span>
  );
}

export default LandingPage;
