"use client";

import { useActionState } from "react";
import { analyzeFeedbackWithAi, type FeedbackAi as Result, type State } from "@/app/actions";
import { Flash } from "./ui";

export function FeedbackAi() {
  const [state, action, pending] = useActionState(analyzeFeedbackWithAi as (p: State, f: FormData) => Promise<State>, {} as State);
  const d = state.data as Result | undefined;
  return (
    <div className="card">
      <h3 className="text-lg text-plum-900">AI interpretation (draft for human review)</h3>
      <p className="mt-1 text-sm text-charcoal-600">Sends redacted, aggregated theme statistics and minimized comments from groups above the minimum group size to Gemini. No team names or respondent identifiers are sent. Language interpretation can be imperfect and is not a psychological or medical assessment. Uses AI credits.</p>
      <form action={action} className="mt-3"><button className="btn-primary" disabled={pending}>{pending ? "Analyzing…" : "Generate AI interpretation"}</button></form>
      {state.error && <div className="mt-3"><Flash kind="error">{state.error}</Flash></div>}
      {d && (
        <div className="mt-4 space-y-3 text-sm">
          <Flash kind="info">AI-generated hypothesis. Review and correct themes before relying on them.</Flash>
          <div><h4 className="label">Themes</h4><ul className="space-y-1">{d.themes.map((t) => <li key={t.theme}><strong>{t.theme}</strong> <span className="text-xs text-charcoal-400">({t.tone})</span>: {t.summary}</li>)}</ul></div>
          {d.emergingConcerns.length > 0 && <div><h4 className="label">Emerging concerns</h4><ul className="list-disc pl-5">{d.emergingConcerns.map((c) => <li key={c}>{c}</li>)}</ul></div>}
          {d.suggestedActions.length > 0 && <div><h4 className="label">Suggested actions</h4><ul className="list-disc pl-5">{d.suggestedActions.map((c) => <li key={c}>{c}</li>)}</ul></div>}
          <div><h4 className="label">Limitations</h4><ul className="list-disc pl-5 text-charcoal-600">{d.limitations.map((c) => <li key={c}>{c}</li>)}</ul></div>
        </div>
      )}
    </div>
  );
}
