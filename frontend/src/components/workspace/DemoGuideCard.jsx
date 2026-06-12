import { MessagesSquare } from "lucide-react";
import { DEMO_FLOW, GUIDE_QUESTIONS } from "@/data/demoCopy";

/** Compact demo steps + three simple prompts that select related files and prefill chat. */
function DemoGuideCard({ ws }) {
  const askInChat = (question) => {
    ws.askSuggestedQuestion(question);
    ws.setActiveTab("chat");
  };

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-0.5">
        {DEMO_FLOW.map((step, i) => (
          <li key={step} className="flex items-start gap-2 text-[11.5px] leading-snug text-foreground">
            <span className="mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-teal-foreground">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-teal-subtle-foreground">
          Try asking · selects files
        </p>
        <div className="flex flex-col gap-1">
          {GUIDE_QUESTIONS.map((q) => (
            <button
              key={q.text}
              type="button"
              onClick={() => askInChat(q)}
              title="Select related files and prefill this prompt"
              className="group flex items-start gap-1.5 rounded-md border border-teal/30 bg-card px-2 py-1 text-left text-[12px] text-foreground shadow-sm transition-colors hover:border-teal hover:bg-teal-subtle/60"
            >
              <MessagesSquare className="mt-0.5 size-3 shrink-0 text-teal" />
              {q.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { DemoGuideCard };
