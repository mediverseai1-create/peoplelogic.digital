import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteReport, saveReportSection, setReportStatus } from "@/app/actions";
import { ActionForm, ConfirmButton } from "@/components/ActionForm";
import { PrintButton } from "@/components/PrintButton";
import { Chip, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/context";
import { can } from "@/lib/roles";

export const metadata = { title: "Report" };

export default async function Report({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: report } = await ctx.supabase.from("leadership_reports").select("*").eq("id", id).eq("org_id", ctx.org.id).maybeSingle();
  if (!report) notFound();
  const { data: sections } = await ctx.supabase.from("report_sections").select("*").eq("report_id", id).eq("org_id", ctx.org.id).order("position");
  const canEdit = can(ctx.role, "generate_reports") && report.status === "draft";

  return (
    <>
      <PageHeader
        title={report.title}
        subtitle={`Status: ${report.status}. Generated from organization data; edit before sharing.`}
        actions={
          <>
            <Link href="/app/reports" className="btn-secondary">All reports</Link>
            <a href={`/api/reports/${id}/export`} className="btn-secondary">Export CSV</a>
            <PrintButton />
          </>
        }
      />
      <div className="space-y-4">
        {(sections ?? []).map((s: any) => (
          <section key={s.id} className="card">
            {canEdit ? (
              <ActionForm action={saveReportSection} submit="Save section" variant="secondary">
                <input type="hidden" name="id" value={s.id} /><input type="hidden" name="report" value={id} />
                <input name="heading" defaultValue={s.heading} className="input font-display text-lg" aria-label="Section heading" />
                <textarea name="body" defaultValue={s.body} rows={Math.min(14, Math.max(4, s.body.split("\n").length + 1))} className="input font-mono text-xs" aria-label="Section body" />
                <div className="text-xs text-charcoal-400">Provenance: {s.provenance}</div>
              </ActionForm>
            ) : (
              <>
                <h2 className="text-xl text-plum-900">{s.heading}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-charcoal-600">{s.body}</p>
                <div className="mt-2"><Chip>{s.provenance}</Chip></div>
              </>
            )}
          </section>
        ))}
      </div>
      <p className="mt-6 text-xs text-charcoal-400">This report is decision support. Indicators are descriptive; hypotheses are not verified causes; no individual employee is assessed.</p>
      {can(ctx.role, "generate_reports") && (
        <div className="no-print mt-6 flex gap-3">
          <form action={setReportStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={report.status === "draft" ? "final" : "draft"} /><button className="btn-primary">{report.status === "draft" ? "Mark final" : "Reopen as draft"}</button></form>
          <ConfirmButton action={deleteReport} fields={{ id }} label="Delete report" confirm="Delete this report permanently?" />
        </div>
      )}
    </>
  );
}
