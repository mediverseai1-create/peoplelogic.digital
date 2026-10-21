import { FilterBar } from "@/components/FilterBar";
import { Chip, DataNotice, EmptyState, PageHeader, monthLabel } from "@/components/ui";
import { buildFindings } from "@/lib/analytics";
import { getBundle, type Filters } from "@/lib/bundle";
import { requireContext } from "@/lib/context";
import { suppressionNotice } from "@/lib/scope";

export const metadata = { title: "Root Cause Analysis" };

export default async function RootCause({ searchParams }: { searchParams: Promise<Filters> }) {
  const ctx = await requireContext();
  const b = await getBundle(ctx, await searchParams);
  const findings = buildFindings(b.scoped.shown);
  const period = `${monthLabel(b.data.periods.first)} to ${monthLabel(b.data.periods.last)}`;
  const notice = suppressionNotice(b.scoped);

  return (
    <>
      <PageHeader title="Root Cause Analysis" subtitle="Possible contributing factors, shown as hypotheses with alternatives. Co-movement in data is not proof of cause." />
      {!b.hasData ? (
        <EmptyState title="No data to analyze" body="Import workforce data to generate evidence-based hypotheses." href="/app/data" cta="Import data" />
      ) : (
        <>
          <FilterBar teams={b.data.dataset.teams} team={b.filters.teamId} from={b.filters.from} to={b.filters.to} />
          <DataNotice period={period} updated={b.data.lastUpdated} sample={`${b.scoped.shown.length} reportable teams`} limitations="Findings are rule-based hypotheses from imported team-level data. Compensation, promotion and management-change data are not yet part of the analysis, so those explanations cannot be tested here." />
          {notice && <p className="mb-4 text-xs text-charcoal-600">{notice}</p>}
          {findings.length === 0 ? (
            <EmptyState title="No patterns to investigate" body="No team showed indicators meeting the thresholds in this period and scope. Evidence may also be insufficient: check the data gaps on the Attrition Intelligence page." />
          ) : (
            <div className="space-y-5">
              {findings.map((f) => (
                <article key={f.teamId} className="card">
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl text-plum-900">{f.teamName}</h2>
                    <div className="flex gap-2"><Chip tone="warn">Rule-based hypothesis (not verified)</Chip><Chip tone="info">Confidence: {f.confidence}</Chip></div>
                  </header>
                  <h3 className="label mt-4">Observed pattern</h3>
                  <p className="text-sm">{f.observedPattern}</p>
                  <h3 className="label mt-4">Supporting evidence <span className="font-normal normal-case">({period})</span></h3>
                  <ul className="list-disc pl-5 text-sm text-charcoal-600">{f.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
                  <h3 className="label mt-4">Possible explanation</h3>
                  <p className="text-sm text-charcoal-600">{f.possibleExplanation}</p>
                  <h3 className="label mt-4">Alternative explanations</h3>
                  <ul className="list-disc pl-5 text-sm text-charcoal-600">{f.alternatives.map((e) => <li key={e}>{e}</li>)}</ul>
                  <h3 className="label mt-4">Additional data needed</h3>
                  <ul className="list-disc pl-5 text-sm text-charcoal-600">{f.dataNeeded.map((e) => <li key={e}>{e}</li>)}</ul>
                  <h3 className="label mt-4">Recommended next steps</h3>
                  <ul className="list-disc pl-5 text-sm text-charcoal-600">{f.nextSteps.map((e) => <li key={e}>{e}</li>)}</ul>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
