import { MessageSquarePlus } from "lucide-react";
import { DEMO_FLOW, SAMPLE_QUESTIONS } from "@/data/demoCopy";

/** Compact demo instructions + sample questions that prefill the chat draft. */
function DemoGuideCard({ ws }) {
  const askInChat = (q) => {
    ws.chat.prefillDraftFromSearch(q);
    ws.setActiveTab("chat");
  };

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
          Sample questions · click to ask in chat
        </p>
        <div className="flex flex-col gap-1">
          {SAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => askInChat(q)}
              title="Prefill this question in the Chat tab"
              className="group flex items-start gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-left text-[12px] text-foreground transition-colors hover:border-teal/40 hover:bg-teal-subtle/40"
            >
              <MessageSquarePlus className="mt-0.5 size-3 shrink-0 text-muted-foreground group-hover:text-teal" />
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { DemoGuideCard };
