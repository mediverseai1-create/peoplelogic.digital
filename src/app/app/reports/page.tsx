import Link from "next/link";
import { generateReport } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { Chip, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/context";
import { REPORT_TYPES } from "@/lib/reports";
import { can } from "@/lib/roles";

export const metadata = { title: "Leadership Reports" };

export default async function Reports() {
  const ctx = await requireContext();
  const canGen = can(ctx.role, "generate_reports");
  const [{ data: reports }, { data: teams }] = await Promise.all([
    ctx.supabase.from("leadership_reports").select("id,title,report_type,status,created_at,updated_at").eq("org_id", ctx.org.id).order("created_at", { ascending: false }).limit(50),
    ctx.supabase.from("teams").select("id,name").eq("org_id", ctx.org.id).order("name"),
  ]);
  return (
    <>
      <PageHeader title="Leadership Reports" subtitle="Reports are generated from your actual data and analysis results. Preview, edit, save and export." />
      {canGen && (
        <section className="card mb-8">
          <h2 className="text-xl text-plum-900">Generate a report</h2>
          <ActionForm action={generateReport} submit="Generate report" className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><label className="label" htmlFor="r-type">Report type</label><select id="r-type" name="type" className="input">{Object.entries(REPORT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="label" htmlFor="r-from">From</label><input id="r-from" name="from" type="month" className="input" /></div>
            <div><label className="label" htmlFor="r-to">To</label><input id="r-to" name="to" type="month" className="input" /></div>
            <div className="md:col-span-2"><label className="label" htmlFor="r-team">Organizational unit</label><select id="r-team" name="team" className="input"><option value="">All authorized teams</option>{(teams ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          </ActionForm>
          <p className="mt-2 text-xs text-charcoal-400">Sections without data are marked as not populated rather than filled in.</p>
        </section>
      )}
      {(reports ?? []).length === 0 ? <EmptyState title="No reports yet" body="Generate your first report once you have imported data." /> : (
        <ul className="space-y-2">
          {(reports ?? []).map((r: any) => (
            <li key={r.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div><Link href={`/app/reports/${r.id}`} className="font-medium text-plum-900 underline">{r.title}</Link><div className="text-xs text-charcoal-400">Created {new Date(r.created_at).toLocaleDateString()}</div></div>
              <Chip tone={r.status === "final" ? "info" : "neutral"}>{r.status}</Chip>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
