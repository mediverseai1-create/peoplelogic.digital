"use client";

import { useActionState, useState } from "react";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/roles";
import type { State } from "@/app/actions";
import { Flash } from "./ui";

export function InviteForm({ teams, action }: { teams: { id: string; name: string }[]; action: (p: State, f: FormData) => Promise<State> }) {
  const [state, formAction, pending] = useActionState(action, {} as State);
  const [role, setRole] = useState("people_analyst");
  return (
    <form action={formAction} className="mt-3 space-y-3">
      <div><label className="label" htmlFor="inv-email">Email</label><input id="inv-email" name="email" type="email" required className="input" /></div>
      <div><label className="label" htmlFor="inv-role">Role</label>
        <select id="inv-role" name="role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>{ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></div>
      {role === "dept_manager" && (
        <fieldset className="text-sm"><legend className="label">Teams this manager may see</legend>
          {teams.length === 0 ? <p className="text-xs text-charcoal-400">Import team data first.</p> : teams.map((t) => <label key={t.id} className="block"><input type="checkbox" name="team_ids" value={t.id} /> {t.name}</label>)}</fieldset>
      )}
      {state.error && <Flash kind="error">{state.error}</Flash>}
      {state.ok && (<Flash kind="ok">{state.ok}{state.data?.link && <input readOnly aria-label="Invitation link" className="input mt-2 text-xs" value={state.data.link} onFocus={(e) => e.currentTarget.select()} />}</Flash>)}
      <button className="btn-primary" disabled={pending}>{pending ? "Creating…" : "Create invitation"}</button>
    </form>
  );
}
