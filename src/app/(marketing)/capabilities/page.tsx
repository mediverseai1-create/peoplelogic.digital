import Link from "next/link";

const CAPS = [
  ["Workforce Overview", "Headcount, turnover, workload, engagement and staffing in one executive view, with data period, coverage and limitations on every metric."],
  ["Attrition Intelligence", "Team-level indicators and risk signals with confidence labels, evidence, data gaps and reviewable status. Descriptive unless a validated model exists."],
  ["Root Cause Analysis", "Observed patterns, possible explanations, alternative explanations, and the additional data needed — never correlation presented as cause."],
  ["Workload & Capacity", "Demand versus capacity, overtime and backlog trends, to show where hiring may help and where redistribution or process change may fit better."],
  ["Employee Feedback", "Aggregate themes and scores from survey exports, with small-group suppression and human review of themes."],
  ["Manager Insights", "Constructive, evidence-based recommendations with owners, priorities, review dates and recorded outcomes. No manager rankings."],
  ["Workforce Simulator", "Deterministic what-if scenarios with visible formulas, saved base and alternative cases, and clear assumptions."],
  ["Turnover Cost", "Editable, reproducible cost model that marks every figure as imported, user-entered or estimated."],
  ["Leadership Reports", "Editable reports generated from your data and analysis, exportable as CSV or via print to PDF."],
  ["Ask PeopleLogic", "A Gemini-powered assistant limited to your organization's approved, aggregated analysis results."],
];

export default function Capabilities() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="text-4xl text-plum-900">Product capabilities</h1>
      <p className="mt-3 max-w-2xl text-charcoal-600">Everything in PeopleLogic works on team-level data you provide. Where data is missing, the platform says so rather than filling the gap.</p>
      <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {CAPS.map(([t, b]) => (
          <div key={t} className="border-t border-ivory-300 pt-4">
            <h2 className="text-xl text-plum-900">{t}</h2>
            <p className="mt-1 text-sm text-charcoal-600">{b}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-14 text-2xl text-plum-900">Data sources</h2>
      <p className="mt-2 max-w-2xl text-sm text-charcoal-600">CSV upload is available now. Connectors for BambooHR, Workday, Rippling, survey tools, Jira and Asana are planned and are labelled as not yet available in the product until implemented and tested.</p>
      <Link href="/sign-up" className="btn-primary mt-8">Get Started</Link>
    </div>
  );
}
