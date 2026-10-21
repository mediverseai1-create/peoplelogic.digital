import { createIntervention, recordOutcome, updateIntervention, updateRecommendation } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { Chip, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/context";
import { can } from "@/lib/roles";

export const metadata = { title: "Manager Insights" };

export default async function Managers() {
  const ctx = await requireContext();
  const canManage = can(ctx.role, "manage_interventions");
  const [{ data: recs }, { data: acts }, { data: teams }, { data: outs }] = await Promise.all([
    ctx.supabase.from("manager_recommendations").select("*").eq("org_id", ctx.org.id).order("created_at", { ascending: false }).limit(100),
    ctx.supabase.from("intervention_actions").select("*").eq("org_id", ctx.org.id).order("created_at", { ascending: false }).limit(100),
    ctx.supabase.from("teams").select("id,name").eq("org_id", ctx.org.id).order("name"),
    ctx.supabase.from("intervention_outcomes").select("*").eq("org_id", ctx.org.id).order("created_at", { ascending: false }).limit(200),
  ]);
  const tn = new Map((teams ?? []).map((t: any) => [t.id, t.name]));

  return (
    <>
      <PageHeader title="Manager Insights" subtitle="Constructive, evidence-based recommendations for supporting teams. These never rank managers or judge individuals." />
      <section>
        <h2 className="mb-2 text-2xl text-plum-900">Recommendations</h2>
        {(recs ?? []).length === 0 ? (
          <EmptyState title="No recommendations yet" body="Run an analysis snapshot on the Attrition Intelligence page. Evidence-based recommendations will appear here for review." href="/app/attrition" cta="Go to Attrition Intelligence" />
        ) : (
          <div className="space-y-3">
            {(recs ?? []).map((r: any) => (
              <article key={r.id} className="card">
                <div className="flex flex-wrap items-center gap-2"><strong>{tn.get(r.team_id) ?? "Organization"}</strong><Chip tone={r.priority === "high" ? "warn" : "neutral"}>{r.priority} priority</Chip><Chip tone="info">{String(r.status).replace("_", " ")}</Chip></div>
                <p className="mt-2 text-sm">{r.recommendation}</p>
                <dl className="mt-2 grid gap-1 text-xs text-charcoal-600 md:grid-cols-2">
                  <div><dt className="inline font-medium">Evidence: </dt><dd className="inline">{r.evidence}</dd></div>
                  <div><dt className="inline font-medium">Intended outcome: </dt><dd className="inline">{r.intended_outcome}</dd></div>
                  <div><dt className="inline font-medium">Suggested owner: </dt><dd className="inline">{r.owner_role}</dd></div>
                  <div><dt className="inline font-medium">Review date: </dt><dd className="inline">{r.review_date ?? "not set"}</dd></div>
                </dl>
                {r.outcome_notes && <p className="mt-2 text-sm text-charcoal-600">Outcome notes: {r.outcome_notes}</p>}
                {canManage && (
                  <ActionForm action={updateRecommendation} submit="Update" variant="secondary" className="mt-3 grid items-end gap-2 md:grid-cols-6">
                    <input type="hidden" name="id" value={r.id} /><input type="hidden" name="owner_role" value={r.owner_role ?? ""} />
                    <select name="status" defaultValue={r.status} className="input" aria-label="Status">{["proposed", "accepted", "in_progress", "completed", "dismissed"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select>
                    <select name="priority" defaultValue={r.priority} className="input" aria-label="Priority">{["low", "medium", "high"].map((s) => <option key={s}>{s}</option>)}</select>
                    <input name="review_date" type="date" defaultValue={r.review_date ?? ""} className="input" aria-label="Review date" />
                    <input name="outcome_notes" defaultValue={r.outcome_notes ?? ""} placeholder="Outcome notes: was this useful?" className="input md:col-span-2" maxLength={2000} aria-label="Outcome notes" />
                  </ActionForm>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-2 text-2xl text-plum-900">Interventions</h2>
        {canManage && (
          <div className="card mb-4">
            <h3 className="text-lg text-plum-900">Add an intervention</h3>
            <ActionForm action={createIntervention} submit="Create intervention" className="mt-2 grid gap-3 md:grid-cols-2">
              <div><label className="label" htmlFor="i-title">Title</label><input id="i-title" name="title" className="input" required minLength={3} maxLength={200} /></div>
              <div><label className="label" htmlFor="i-team">Team</label><select id="i-team" name="team_id" className="input"><option value="">Organization-wide</option>{(teams ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="label" htmlFor="i-owner">Owner</label><input id="i-owner" name="owner" className="input" maxLength={120} /></div>
              <div><label className="label" htmlFor="i-due">Review / due date</label><input id="i-due" name="due_date" type="date" className="input" /></div>
              <div className="md:col-span-2"><label className="label" htmlFor="i-desc">Description</label><textarea id="i-desc" name="description" className="input" rows={2} maxLength={2000} /></div>
              <input type="hidden" name="source" value="manual" />
            </ActionForm>
          </div>
        )}
        {(acts ?? []).length === 0 ? <p className="text-sm text-charcoal-600">No interventions tracked yet.</p> : (
          <div className="space-y-3">
            {(acts ?? []).map((a: any) => {
              const o = (outs ?? []).filter((x: any) => x.action_id === a.id);
              return (
                <article key={a.id} className="card">
                  <div className="flex flex-wrap items-center gap-2"><strong>{a.title}</strong><Chip tone="info">{String(a.status).replace("_", " ")}</Chip><span className="text-xs text-charcoal-400">{tn.get(a.team_id) ?? "Organization-wide"} · owner {a.owner ?? "unassigned"} · due {a.due_date ?? "unset"}</span></div>
                  {a.description && <p className="mt-1 text-sm text-charcoal-600">{a.description}</p>}
                  {o.length > 0 && <ul className="mt-2 text-sm">{o.map((x: any) => <li key={x.id} className="text-charcoal-600">Outcome ({new Date(x.created_at).toLocaleDateString()}): <strong>{String(x.useful).replace("_", " ")}</strong>{x.notes ? ` - ${x.notes}` : ""}</li>)}</ul>}
                  {canManage && (
                    <div className="mt-3 flex flex-wrap gap-4">
                      <ActionForm action={updateIntervention} submit="Set status" variant="secondary" className="flex items-end gap-2"><input type="hidden" name="id" value={a.id} /><select name="status" defaultValue={a.status} className="input w-auto" aria-label="Status">{["open", "in_progress", "done", "cancelled"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select></ActionForm>
                      <ActionForm action={recordOutcome} submit="Record outcome" variant="secondary" className="flex flex-wrap items-end gap-2"><input type="hidden" name="action_id" value={a.id} /><select name="useful" className="input w-auto" aria-label="Was it useful?"><option value="yes">Useful</option><option value="partly">Partly useful</option><option value="no">Not useful</option><option value="too_early">Too early to tell</option></select><input name="notes" placeholder="Notes" className="input" maxLength={2000} aria-label="Outcome notes" /></ActionForm>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
