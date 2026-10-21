import { renameTheme } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { Chart } from "@/components/Charts";
import { FeedbackAi } from "@/components/FeedbackAi";
import { DataNotice, EmptyState, PageHeader, monthLabel, num } from "@/components/ui";
import { getBundle } from "@/lib/bundle";
import { requireContext } from "@/lib/context";
import { PRIVACY_NOTICE } from "@/lib/privacy";
import { can } from "@/lib/roles";

export const metadata = { title: "Employee Feedback" };

export default async function Feedback() {
  const ctx = await requireContext();
  if (!can(ctx.role, "view_feedback")) {
    return (<><PageHeader title="Employee Feedback" /><EmptyState title="Restricted" body="Survey feedback is limited to HR and analytics roles to protect respondent privacy. Aggregated feedback themes appear in leadership reports." /></>);
  }
  const b = await getBundle(ctx);
  const names = new Map(b.data.dataset.teams.map((t) => [t.id, t.name]));
  const T = b.threshold;

  // Only groups (team x period) meeting the threshold contribute to any output.
  const ok = b.data.feedback.filter((f) => f.responses >= T);
  const hidden = b.data.feedback.length - ok.length;
  const byPeriod = new Map<string, { s: number; n: number }>();
  const byTheme = new Map<string, { n: number; s: number; k: number }>();
  for (const f of ok) {
    if (f.avgScore != null) { const c = byPeriod.get(f.period) ?? { s: 0, n: 0 }; c.s += f.avgScore * f.responses; c.n += f.responses; byPeriod.set(f.period, c); }
    for (const [th, st] of Object.entries(f.themes)) { const c = byTheme.get(th) ?? { n: 0, s: 0, k: 0 }; c.n += st.n; if (st.avgScore != null) { c.s += st.avgScore * st.n; c.k += st.n; } byTheme.set(th, c); }
  }
  const trend = [...byPeriod].sort().map(([p, v]) => ({ period: monthLabel(p), "Average score": Number((v.s / v.n).toFixed(2)) }));
  const themes = [...byTheme].map(([theme, v]) => ({ theme, n: v.n, avg: v.k ? v.s / v.k : null })).sort((a, b2) => b2.n - a.n);
  const latest = [...new Set(b.data.feedback.map((f) => f.period))].sort().at(-1);
  const teamRows = b.data.feedback.filter((f) => f.period === latest);
  const canEdit = can(ctx.role, "import_data");

  return (
    <>
      <PageHeader title="Employee Feedback" subtitle="Aggregate sentiment and themes from survey exports. Respondents are never identified." />
      <p className="mb-4 text-xs text-charcoal-600">{PRIVACY_NOTICE}</p>
      {b.data.feedback.length === 0 ? (
        <EmptyState title="No survey data" body="Import a survey export (team, period, theme, score, optional comment). Do not include names, emails or respondent IDs." href="/app/data" cta="Import survey data" />
      ) : (
        <>
          <DataNotice period={`${monthLabel(b.data.periods.first)} to ${monthLabel(latest)}`} updated={b.data.lastUpdated} sample={`${num(ok.reduce((a, f) => a + f.responses, 0))} responses in reportable groups`} coverage={`minimum group size ${T}`} limitations={`Groups with fewer than ${T} responses are excluded${hidden > 0 ? ` (${hidden} group-period(s) currently hidden)` : ""}. Scores are self-reported and do not measure any individual's wellbeing or intentions.`} />
          <div className="grid gap-4 lg:grid-cols-2">
            {trend.length > 0 ? <Chart title="Average survey score over time (1-5)" data={trend} xKey="period" series={[{ key: "Average score", label: "Average score" }]} /> : <EmptyState title="Not enough responses" body={`No group has ${T}+ responses in a period, so trends are suppressed.`} />}
            <div className="card">
              <h3 className="text-sm font-medium text-plum-900">Themes (reportable groups)</h3>
              {themes.length ? (
                <table className="mt-2 w-full text-sm"><thead><tr><th className="th">Theme</th><th className="th">Responses</th><th className="th">Avg score</th></tr></thead>
                  <tbody>{themes.map((t) => <tr key={t.theme}><td className="td">{t.theme}</td><td className="td">{t.n}</td><td className="td">{t.avg?.toFixed(2) ?? "—"}</td></tr>)}</tbody></table>
              ) : <p className="mt-2 text-sm text-charcoal-600">No themes available above the threshold.</p>}
            </div>
          </div>
          <div className="mt-6 overflow-x-auto rounded-lg border border-ivory-300 bg-white/70">
            <table className="min-w-full text-sm">
              <thead className="border-b border-ivory-300"><tr><th className="th">Team ({monthLabel(latest)})</th><th className="th">Responses</th><th className="th">Average score</th></tr></thead>
              <tbody className="divide-y divide-ivory-300">
                {teamRows.map((f) => f.responses >= T
                  ? <tr key={f.teamId}><td className="td">{names.get(f.teamId) ?? "Team"}</td><td className="td">{f.responses}</td><td className="td">{f.avgScore?.toFixed(2) ?? "—"}</td></tr>
                  : <tr key={f.teamId}><td className="td text-charcoal-400">Suppressed (small group)</td><td className="td text-charcoal-400">&lt; {T}</td><td className="td text-charcoal-400">—</td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <FeedbackAi />
            {canEdit && (
              <div className="card">
                <h3 className="text-lg text-plum-900">Human review: correct a theme</h3>
                <p className="mt-1 text-sm text-charcoal-600">Relabel or merge a theme across all responses (for example, fix a misspelling or combine two labels).</p>
                <ActionForm action={renameTheme} submit="Relabel theme" variant="secondary" className="mt-3 space-y-2">
                  <input name="from" className="input" placeholder="Current theme label" required list="theme-list" />
                  <datalist id="theme-list">{themes.map((t) => <option key={t.theme} value={t.theme} />)}</datalist>
                  <input name="to" className="input" placeholder="New label" required />
                </ActionForm>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
