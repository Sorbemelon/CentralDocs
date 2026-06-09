import { DEMO_FLOW, SAMPLE_QUESTIONS } from "@/data/demoCopy";

/** Compact demo instructions + sample questions. */
function DemoGuideCard({ ws }) {
  return (
    <div className="flex flex-col gap-2.5">
      <ol className="flex flex-col gap-1">
        {DEMO_FLOW.map((step, i) => (
          <li key={step} className="flex items-start gap-2 text-[12px] text-foreground">
            <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Sample questions
        </p>
        <div className="flex flex-col gap-1">
          {SAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ws.notifyDeferred("Ask sample question")}
              className="rounded-md border border-border bg-card/60 px-2 py-1 text-left text-[12px] text-foreground transition-colors hover:border-primary/40 hover:bg-accent/60"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { DemoGuideCard };
