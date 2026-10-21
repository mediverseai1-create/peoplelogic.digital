"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { askAssistant, type State } from "@/app/actions";
import { Chip, Flash } from "./ui";

export interface Msg {
  id: string;
  role: string;
  content: string;
  structured?: { confidence?: string; insufficientEvidence?: boolean; sources?: { label: string; period?: string }[]; limitations?: string[]; suggestedNextSteps?: string[] } | null;
}

const EXAMPLES = [
  "Which teams appear to be under the greatest workload pressure?",
  "Why has turnover increased in the teams that show a rise?",
  "What are the main workforce planning risks?",
  "Which retention interventions should we review first?",
  "What additional data would improve this analysis?",
];

export function AskClient({ conversationId, messages }: { conversationId: string | null; messages: Msg[] }) {
  const [state, action, pending] = useActionState(askAssistant as (p: State, f: FormData) => Promise<State>, {} as State);
  const router = useRouter();
  useEffect(() => {
    if (!conversationId && state.data?.conversationId) router.replace(`/app/ask?c=${state.data.conversationId}`);
  }, [conversationId, state.data, router]);
  return (
    <div>
      <div className="space-y-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="card">
            <p className="text-sm text-charcoal-600">Ask about your team-level workforce data. Answers use only your organization&apos;s approved, aggregated analysis results, cite their sources and periods, and say when evidence is insufficient.</p>
            <ul className="mt-3 flex flex-wrap gap-2">{EXAMPLES.map((e) => <li key={e}><form action={action}><input type="hidden" name="question" value={e} /><button className="chip border-ivory-300 bg-white hover:bg-ivory-100" disabled={pending}>{e}</button></form></li>)}</ul>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "ml-auto max-w-2xl rounded-lg bg-plum-900 px-4 py-3 text-sm text-ivory" : "card max-w-3xl text-sm"}>
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.role === "assistant" && m.structured && (
              <div className="mt-3 space-y-2 border-t border-ivory-300 pt-3 text-xs text-charcoal-600">
                <div className="flex flex-wrap gap-2"><Chip tone="info">Confidence: {m.structured.confidence}</Chip><Chip tone="warn">AI-generated, review before acting</Chip>{m.structured.insufficientEvidence && <Chip tone="warn">Insufficient evidence</Chip>}</div>
                {m.structured.sources && m.structured.sources.length > 0 && <div><strong>Sources:</strong> {m.structured.sources.map((s) => `${s.label}${s.period ? ` (${s.period})` : ""}`).join("; ")}</div>}
                {m.structured.limitations && m.structured.limitations.length > 0 && <div><strong>Limitations:</strong> {m.structured.limitations.join(" ")}</div>}
                {m.structured.suggestedNextSteps && m.structured.suggestedNextSteps.length > 0 && <div><strong>Next steps:</strong> {m.structured.suggestedNextSteps.join(" ")}</div>}
              </div>
            )}
          </div>
        ))}
        {pending && <p className="text-sm text-charcoal-400">Thinking…</p>}
      </div>
      {state.error && <div className="mt-4"><Flash kind="error">{state.error}</Flash></div>}
      <form action={action} className="no-print mt-6 flex gap-2">
        {conversationId && <input type="hidden" name="conversation" value={conversationId} />}
        {state.data?.conversationId && !conversationId && <input type="hidden" name="conversation" value={state.data.conversationId} />}
        <label className="sr-only" htmlFor="q">Your question</label>
        <input id="q" name="question" className="input" placeholder="Ask about workload, turnover, feedback, cost or scenarios…" required minLength={3} maxLength={1000} autoComplete="off" />
        <button className="btn-primary" disabled={pending}>Ask</button>
      </form>
    </div>
  );
}
