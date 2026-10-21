import Link from "next/link";

const PROBLEMS = [
  ["Reactive by default", "Most organizations learn why people leave only after resignations or exit interviews — when the cost is already incurred."],
  ["Signals live in different places", "Workload, staffing, engagement and turnover sit in separate systems, so patterns across them are easy to miss."],
  ["Averages hide teams", "Company-wide figures can look stable while specific teams carry unsustainable load."],
];

const FLOW = [
  ["Connect", "Import team-level workforce, workload, staffing, survey and cost data from CSV files today."],
  ["Interpret", "See transparent, team-level indicators with the evidence, period and limits behind each one."],
  ["Investigate", "Review possible explanations and alternatives, without correlation being presented as cause."],
  ["Act", "Simulate staffing scenarios, estimate turnover cost, and track interventions through to outcomes."],
];

export default function Home() {
  return (
    <>
      <section className="bg-plum-950 text-ivory">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-5 md:py-28">
          <div className="md:col-span-3">
            <p className="text-xs uppercase tracking-[0.2em] text-rose-muted">Workforce intelligence</p>
            <h1 className="mt-4 text-4xl leading-tight md:text-6xl">Understand workforce risk before it becomes employee turnover.</h1>
            <p className="mt-6 max-w-xl text-lg text-ivory-300">
              PeopleLogic connects workforce, workload, engagement, and organizational data to help leaders understand where teams need support, why risks may be emerging, and which interventions are worth considering.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sign-up" className="btn-accent">Get Started</Link>
              <Link href="/capabilities" className="btn border border-ivory/30 text-ivory hover:bg-white/10">Explore the Platform</Link>
            </div>
          </div>
          <aside className="self-end rounded-lg border border-white/15 p-6 md:col-span-2" aria-label="Privacy by design">
            <h2 className="text-xl">Team-level by design</h2>
            <ul className="mt-3 space-y-2 text-sm text-ivory-300">
              <li>No individual attrition scores or employee rankings.</li>
              <li>Small groups are suppressed so insights cannot identify a person.</li>
              <li>Every insight shows its evidence, period and uncertainty.</li>
              <li>Decision support only — leaders decide.</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-3xl text-plum-900">The workforce problem</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {PROBLEMS.map(([t, b]) => (
            <div key={t} className="border-t-2 border-terracotta pt-4">
              <h3 className="text-xl text-plum-900">{t}</h3>
              <p className="mt-2 text-sm text-charcoal-600">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-ivory-300 bg-ivory-100">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-3xl text-plum-900">From signals to action</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-4">
            {FLOW.map(([t, b], i) => (
              <li key={t}>
                <div className="font-display text-4xl text-terracotta">{i + 1}</div>
                <h3 className="mt-1 text-lg text-plum-900">{t}</h3>
                <p className="mt-1 text-sm text-charcoal-600">{b}</p>
              </li>
            ))}
          </ol>
          <Link href="/how-it-works" className="mt-8 inline-block text-sm font-medium text-plum-700 underline">See how it works</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-3xl text-plum-900">Honest about what it knows</h2>
            <p className="mt-3 text-charcoal-600">
              PeopleLogic separates observed data, statistical estimates, AI-generated hypotheses and verified findings. It will tell you when there is not enough evidence, and it never claims a model is trained or validated unless that work has been performed.
            </p>
            <Link href="/privacy-principles" className="mt-4 inline-block text-sm font-medium text-plum-700 underline">Read our privacy and responsible AI principles</Link>
          </div>
          <div className="card">
            <h3 className="text-lg text-plum-900">Ready to start?</h3>
            <p className="mt-1 text-sm text-charcoal-600">Create an organization, upload your first dataset, and see which analyses your data supports.</p>
            <Link href="/sign-up" className="btn-primary mt-4">Get Started</Link>
          </div>
        </div>
      </section>
    </>
  );
}
