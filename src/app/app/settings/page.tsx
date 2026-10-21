import { applyRetention, deleteOrgData, updateOrgSettings } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/context";
import { can } from "@/lib/roles";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const ctx = await requireContext();
  const canEdit = can(ctx.role, "manage_settings");
  const { data: logs } = can(ctx.role, "view_audit")
    ? await ctx.supabase.from("audit_logs").select("id,action,entity,detail,created_at").eq("org_id", ctx.org.id).order("created_at", { ascending: false }).limit(40)
    : { data: [] as any[] };
  const o = ctx.org;
  return (
    <>
      <PageHeader title="Settings" subtitle="Organization profile, privacy thresholds, retention, export and deletion." />
      {!canEdit ? <EmptyState title="Read-only" body="Only Organization Owners and Administrators can change settings." /> : (
        <div className="space-y-6">
          <section className="card">
            <h2 className="text-xl text-plum-900">Organization & privacy</h2>
            <ActionForm action={updateOrgSettings} submit="Save settings" className="mt-3 grid gap-3 md:grid-cols-2">
              <div><label className="label" htmlFor="s-name">Organization name</label><input id="s-name" name="name" defaultValue={o.name} className="input" required /></div>
              <div><label className="label" htmlFor="s-ind">Industry</label><input id="s-ind" name="industry" defaultValue={o.industry ?? ""} className="input" /></div>
              <div><label className="label" htmlFor="s-size">Size</label><select id="s-size" name="size_band" defaultValue={o.size_band ?? ""} className="input"><option value="">Select</option>{["1-50", "51-200", "201-1000", "1001-5000", "5000+"].map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="label" htmlFor="s-min">Minimum group size</label><input id="s-min" name="min_group_size" type="number" min={5} max={200} defaultValue={o.min_group_size} className="input" /><p className="mt-1 text-xs text-charcoal-400">Teams or survey groups smaller than this are suppressed or combined. Minimum 5; default 8.</p></div>
              <div><label className="label" htmlFor="s-ret">Survey data retention (days)</label><input id="s-ret" name="retention_days" type="number" min={30} max={3650} defaultValue={o.retention_days} className="input" /></div>
            </ActionForm>
          </section>

          <section className="card">
            <h2 className="text-xl text-plum-900">Retention</h2>
            <p className="mt-1 text-sm text-charcoal-600">Survey response records older than the retention period can be removed. Automatic scheduling requires a database job (see README); until one is set up, run it here.</p>
            <ActionForm action={applyRetention} submit="Apply retention now" variant="secondary" className="mt-3"><span /></ActionForm>
          </section>

          <section className="card">
            <h2 className="text-xl text-plum-900">Export your data</h2>
            <p className="mt-1 text-sm text-charcoal-600">Download aggregate organization records as JSON. Raw survey comments are not included.</p>
            <a className="btn-secondary mt-3" href="/api/org/export">Download export</a>
          </section>

          {can(ctx.role, "delete_org_data") && (
            <section className="card border-signal-high/40">
              <h2 className="text-xl text-signal-high">Delete organization data</h2>
              <p className="mt-1 text-sm text-charcoal-600">Permanently deletes this organization and all of its data, including members, imports, surveys, scenarios and reports. This cannot be undone.</p>
              <ActionForm action={deleteOrgData} submit="Permanently delete" variant="danger" className="mt-3 space-y-2">
                <label className="label" htmlFor="del">Type “{o.name}” to confirm</label>
                <input id="del" name="confirm" className="input" autoComplete="off" />
              </ActionForm>
            </section>
          )}
        </div>
      )}

      {can(ctx.role, "view_audit") && (
        <section className="mt-10">
          <h2 className="mb-2 text-2xl text-plum-900">Audit log</h2>
          <div className="overflow-x-auto rounded-lg border border-ivory-300 bg-white/70">
            <table className="min-w-full text-sm"><thead className="border-b border-ivory-300"><tr><th className="th">When</th><th className="th">Action</th><th className="th">Entity</th><th className="th">Detail</th></tr></thead>
              <tbody className="divide-y divide-ivory-300">{(logs ?? []).map((l: any) => <tr key={l.id}><td className="td">{new Date(l.created_at).toLocaleString()}</td><td className="td">{l.action}</td><td className="td">{l.entity}</td><td className="td text-xs text-charcoal-600">{JSON.stringify(l.detail)}</td></tr>)}</tbody></table>
          </div>
        </section>
      )}
    </>
  );
}
