import { reviewInsight, saveAnalysisSnapshot } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { FilterBar } from "@/components/FilterBar";
import { Chip, DataNotice, EmptyState, LevelChip, PageHeader, monthLabel, pct } from "@/components/ui";
import { getBundle, type Filters } from "@/lib/bundle";
import { requireContext } from "@/lib/context";
import { can } from "@/lib/roles";
import { suppressionNotice } from "@/lib/scope";

export const metadata = { title: "Attrition Intelligence" };

export default async function Attrition({ searchParams }: { searchParams: Promise<Filters> }) {
  const ctx = await requireContext();
  const b = await getBundle(ctx, await searchParams);
  const canRun = can(ctx.role, "run_analysis");
  const { data: insights } = await ctx.supabase
    .from("attrition_insights")
    .select("id,team_id,title,evidence_level,confidence,review_status,reviewer_note,created_at")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const teamName = new Map(b.data.dataset.teams.map((t) => [t.id, t.name]));
  const notice = suppressionNotice(b.scoped);

  return (
    <>
      <PageHeader
        title="Attrition Intelligence"
        subtitle="Team-level indicators and risk signals with their evidence. These are descriptive, not individual predictions."
        actions={canRun && b.hasData ? <ActionForm action={saveAnalysisSnapshot} submit="Save analysis snapshot" variant="secondary" className="flex flex-col items-end gap-2"><span /></ActionForm> : null}
      />
      <div className="mb-5 rounded-md border border-signal-info/30 bg-signal-info/5 p-4 text-sm text-charcoal-600">
        <strong className="text-plum-900">Model status:</strong> no predictive attrition model has been trained or validated for this organization. Results below are <em>observed indicators</em> and <em>potential risk signals</em> computed with transparent rules. A statistically validated, temporally tested model requires sufficient labelled history and has not been run.
      </div>
      {!b.hasData ? (
        <EmptyState title="No workforce data to analyze" body="Import headcount and departures first. Adding workload, staffing and survey data enables more indicators." href="/app/data" cta="Import data" />
      ) : (
        <>
          <FilterBar teams={b.data.dataset.teams} team={b.filters.teamId} from={b.filters.from} to={b.filters.to} />
          <DataNotice period={`${monthLabel(b.data.periods.first)} to ${monthLabel(b.data.periods.last)}`} updated={b.data.lastUpdated} sample={`${b.scoped.shown.length} reportable teams`} />
          {notice && <p className="mb-4 text-xs text-charcoal-600">{notice}</p>}
          {b.scoped.shown.length === 0 ? (
            <EmptyState title="No teams meet the privacy threshold" body={`Team-level detail requires headcount of at least ${b.threshold}. Import headcount history, or ask an administrator to review the minimum group size in Settings.`} href="/app/data" cta="Import headcount" />
          ) : (
            <div className="space-y-4">
              {b.scoped.shown.map((t) => (
                <article key={t.teamId} className="card">
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-xl text-plum-900">{t.teamName}</h2>
                      <p className="text-xs text-charcoal-400">{t.department ?? "No department"} · headcount {t.headcount ?? "unknown"} · {t.periodsObserved} months of data</p>
                    </div>
                    <div className="flex items-center gap-2"><Chip tone="info">Confidence: {t.confidence}</Chip><LevelChip level={t.level} /></div>
                  </header>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                    <div><dt className="label">Recent turnover</dt><dd>{pct(t.recentTurnoverRate)} <span className="text-xs text-charcoal-400">({t.recentDepartures ?? "—"} dep.)</span></dd></div>
                    <div><dt className="label">Prior window</dt><dd>{pct(t.priorTurnoverRate)}</dd></div>
                    <div><dt className="label">Demand / capacity</dt><dd>{t.utilization?.toFixed(2) ?? "—"}</dd></div>
                    <div><dt className="label">Vacancy rate</dt><dd>{pct(t.vacancyRate, 0)}</dd></div>
                    <div><dt className="label">Survey change</dt><dd>{t.engagementDelta != null ? t.engagementDelta.toFixed(2) : t.engagementSuppressed ? "suppressed" : "—"}</dd></div>
                  </dl>
                  {t.signals.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {t.signals.map((s) => (
                        <li key={s.id} className="rounded-md border border-ivory-300 bg-white p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2"><strong>{s.label}</strong><Chip tone={s.kind === "observed_indicator" ? "neutral" : "warn"}>{s.kind === "observed_indicator" ? "Observed indicator" : "Potential risk signal"}</Chip></div>
                          <p className="mt-1 text-charcoal-600">{s.observed}</p>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-3 text-sm text-charcoal-600">No indicators met the thresholds. This does not mean there is no issue.</p>}
                  {t.dataGaps.length > 0 && <details className="mt-3 text-xs text-charcoal-600"><summary className="cursor-pointer">Data gaps limiting this view ({t.dataGaps.length})</summary><ul className="mt-1 list-disc pl-5">{t.dataGaps.map((g) => <li key={g}>{g}</li>)}</ul></details>}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <section className="mt-10">
        <h2 className="text-2xl text-plum-900">Saved insights for human review</h2>
        <p className="mb-3 text-sm text-charcoal-600">Annotate and mark findings as reviewed or verified after checking them against organizational context. Only a person can mark a finding verified.</p>
        {(insights ?? []).length === 0 ? <p className="text-sm text-charcoal-600">No saved insights yet. Use “Save analysis snapshot” to store the current indicators for review.</p> : (
          <div className="space-y-3">
            {(insights ?? []).map((i: any) => (
              <div key={i.id} className="card">
                <div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{i.title}</strong><Chip>{String(i.evidence_level).replace(/_/g, " ")}</Chip><Chip tone="info">confidence: {i.confidence}</Chip><Chip tone={i.review_status === "verified" ? "info" : "neutral"}>{i.review_status}</Chip></div>
                <p className="mt-1 text-xs text-charcoal-400">{teamName.get(i.team_id) ?? ""} · saved {new Date(i.created_at).toLocaleDateString()}</p>
                {i.reviewer_note && <p className="mt-1 text-sm text-charcoal-600">Note: {i.reviewer_note}</p>}
                {canRun && (
                  <ActionForm action={reviewInsight} submit="Save review" variant="secondary" className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={i.id} />
                    <select name="status" defaultValue={i.review_status} className="input w-auto" aria-label="Review status">
                      <option value="unreviewed">Unreviewed</option><option value="reviewed">Reviewed</option><option value="verified">Verified</option><option value="dismissed">Dismissed</option>
                    </select>
                    <input name="note" defaultValue={i.reviewer_note ?? ""} placeholder="Annotation" className="input min-w-[14rem] flex-1" maxLength={1000} aria-label="Annotation" />
                  </ActionForm>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
