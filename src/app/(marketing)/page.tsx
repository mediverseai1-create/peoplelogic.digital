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
      <section className="bg-gradient-to-b from-[#e3edc3] via-[#eef2dc] to-ivory">
        <div className="mx-auto max-w-4xl px-5 pb-16 pt-20 text-center md:pb-24 md:pt-28">
          <p className="inline-block rounded-full border border-plum-900/15 bg-white/60 px-3 py-1 text-xs font-medium text-plum-800">Workforce intelligence for people leaders</p>
          <h1 className="mt-6 text-4xl leading-[1.08] text-plum-900 md:text-6xl">Understand workforce risk before it becomes employee turnover.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-charcoal-600">
            PeopleLogic connects workforce, workload, engagement, and organizational data to help leaders understand where teams need support, why risks may be emerging, and which interventions are worth considering.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/sign-up" className="btn-primary px-7 py-3">Get Started</Link>
            <Link href="/capabilities" className="btn-secondary bg-white/70 px-7 py-3">Explore the Platform</Link>
          </div>
          <ul className="mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-2 text-sm text-plum-800" aria-label="Privacy by design">
            {["No individual attrition scores", "Small groups are suppressed", "Evidence and uncertainty on every insight", "Decision support only"].map((t) => <li key={t} className="rounded-full border border-plum-900/10 bg-white/70 px-4 py-1.5">{t}</li>)}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-3xl text-plum-900">The workforce problem</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {PROBLEMS.map(([t, b]) => (
            <div key={t} className="rounded-2xl border border-ivory-300 bg-white p-6">
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
                <div className="font-display text-4xl text-plum-600">{i + 1}</div>
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
