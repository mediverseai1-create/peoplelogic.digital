import { Chip, EmptyState, PageHeader } from "@/components/ui";
import { ImportWizard } from "@/components/ImportWizard";
import { CONNECTORS, connectorStatus } from "@/lib/integrations";
import { requireContext } from "@/lib/context";
import { DATASETS, DATASET_TYPES } from "@/lib/csv";
import { can } from "@/lib/roles";

export const metadata = { title: "Data Sources" };

export default async function DataSources() {
  const ctx = await requireContext();
  const canImport = can(ctx.role, "import_data");
  const { data: jobs } = await ctx.supabase.from("import_jobs").select("*").eq("org_id", ctx.org.id).order("created_at", { ascending: false }).limit(15);
  return (
    <>
      <PageHeader title="Data Sources" subtitle="CSV upload is available now. Third-party connectors are labelled honestly until implemented and tested." />
      <section>
        <h2 className="mb-3 text-2xl text-plum-900">Connectors</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="card border-signal-ok/40"><div className="flex items-center justify-between"><strong>CSV uploads</strong><Chip tone="info">Available</Chip></div><p className="mt-1 text-xs text-charcoal-600">Guided import with validation, mapping and privacy checks.</p></div>
          {CONNECTORS.map((c) => (
            <div key={c.id} className="card"><div className="flex items-center justify-between"><strong>{c.name}</strong><Chip>{connectorStatus(c)}</Chip></div><p className="mt-1 text-xs text-charcoal-600">{c.category}. Not connected: this integration is not implemented yet and no data flows from it.</p></div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-2xl text-plum-900">Import a CSV</h2>
        {canImport ? <ImportWizard /> : <EmptyState title="Import not permitted" body="Your role cannot import data. Ask an administrator, HR Director or People Analyst." />}
        <details className="mt-4 text-sm"><summary className="cursor-pointer text-plum-900">Sample templates (templates only, not real data)</summary>
          <ul className="mt-2 list-disc pl-5">{DATASET_TYPES.map((t) => <li key={t}><a className="underline" href={`/api/templates/${t}`}>{DATASETS[t].label}</a></li>)}</ul></details>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-2xl text-plum-900">Import history</h2>
        {(jobs ?? []).length === 0 ? <p className="text-sm text-charcoal-600">No imports yet.</p> : (
          <div className="overflow-x-auto rounded-lg border border-ivory-300 bg-white/70">
            <table className="min-w-full text-sm"><thead className="border-b border-ivory-300"><tr><th className="th">When</th><th className="th">Dataset</th><th className="th">File</th><th className="th">Imported</th><th className="th">Rejected</th><th className="th">Duplicates</th><th className="th">Status</th></tr></thead>
              <tbody className="divide-y divide-ivory-300">{(jobs ?? []).map((j: any) => <tr key={j.id}><td className="td">{new Date(j.created_at).toLocaleString()}</td><td className="td">{DATASETS[j.dataset_type as keyof typeof DATASETS]?.label ?? j.dataset_type}</td><td className="td">{j.filename}</td><td className="td">{j.rows_imported}/{j.rows_total}</td><td className="td">{j.rows_rejected}</td><td className="td">{j.rows_duplicate}</td><td className="td"><Chip tone={j.status === "completed" ? "info" : "warn"}>{j.status}</Chip></td></tr>)}</tbody></table>
          </div>
        )}
      </section>
    </>
  );
}
