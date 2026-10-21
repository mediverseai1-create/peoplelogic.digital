import Link from "next/link";
import { getPlans } from "@/lib/plans";
import { CAPS, PRINCIPLES, STEPS } from "@/lib/marketing-content";

export function CapabilitiesSection() {
  return (
    <section id="capabilities" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
      <h2 className="text-3xl text-plum-900 md:text-4xl">Product capabilities</h2>
      <p className="mt-3 max-w-2xl text-charcoal-600">Everything in PeopleLogic works on team-level data you provide. Where data is missing, the platform says so rather than filling the gap.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {CAPS.map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-ivory-300 bg-white p-6">
            <h3 className="text-xl text-plum-900">{t}</h3>
            <p className="mt-2 text-sm text-charcoal-600">{b}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 max-w-2xl text-sm text-charcoal-600">CSV upload is available now. Connectors for BambooHR, Workday, Rippling, survey tools, Jira and Asana are planned and labelled as not yet available until implemented and tested.</p>
      <Link href="/capabilities" className="mt-4 inline-block text-sm font-medium text-plum-700 underline">View capabilities page</Link>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-ivory-300 bg-ivory-100">
      <div className="mx-auto max-w-4xl px-5 py-20">
        <h2 className="text-3xl text-plum-900 md:text-4xl">How it works</h2>
        <ol className="mt-10 space-y-8">
          {STEPS.map(([t, b], i) => (
            <li key={t} className="flex gap-5">
              <div className="font-display text-4xl text-plum-600">{i + 1}</div>
              <div>
                <h3 className="text-xl text-plum-900">{t}</h3>
                <p className="mt-1 text-sm text-charcoal-600">{b}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 rounded-2xl border border-ivory-300 bg-white p-4 text-sm text-charcoal-600">
          Indicators are descriptive. PeopleLogic does not claim a trained or validated attrition prediction model; where history is too thin it provides indicators and clearly labelled hypotheses only.
        </p>
        <Link href="/how-it-works" className="mt-4 inline-block text-sm font-medium text-plum-700 underline">View how it works page</Link>
      </div>
    </section>
  );
}

export function PrinciplesSection() {
  return (
    <section id="privacy" className="mx-auto max-w-5xl scroll-mt-20 px-5 py-20">
      <h2 className="text-3xl text-plum-900 md:text-4xl">Privacy and responsible AI principles</h2>
      <p className="mt-3 max-w-2xl text-charcoal-600">PeopleLogic helps leaders improve working conditions, staffing and management practices. It is not built to monitor employees.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {PRINCIPLES.map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-ivory-300 bg-white p-6">
            <h3 className="text-lg text-plum-900">{t}</h3>
            <p className="mt-2 text-sm text-charcoal-600">{b}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-charcoal-600">We do not claim certification or compliance with GDPR, NDPR, ISO 27001, SOC 2 or similar frameworks. Your organization remains responsible for lawful data collection, consent and retention.</p>
      <Link href="/privacy-principles" className="mt-4 inline-block text-sm font-medium text-plum-700 underline">View principles page</Link>
    </section>
  );
}

export function PricingSection() {
  const plans = getPlans();
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-ivory-300 bg-ivory-100">
      <div className="mx-auto max-w-5xl px-5 py-20">
        <h2 className="text-3xl text-plum-900 md:text-4xl">Pricing</h2>
        <p className="mt-3 max-w-2xl text-charcoal-600">Two plans. Usage limits are configured per plan and shown inside the product once set.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {plans.map((p) => (
            <div key={p.id} className={`card flex flex-col ${p.id === "enterprise" ? "border-plum-700" : ""}`}>
              <h3 className="text-2xl text-plum-900">{p.name}</h3>
              <div className="mt-2 font-display text-5xl text-plum-900">${p.price}</div>
              <p className="mt-3 text-sm text-charcoal-600">{p.tagline}</p>
              <ul className="mt-4 flex-1 list-disc space-y-1 pl-5 text-sm text-charcoal-600">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link href={`/sign-up?plan=${p.id}`} className={`mt-6 ${p.id === "enterprise" ? "btn-accent" : "btn-primary"}`}>Get Started</Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-charcoal-400">Payment is completed through an external checkout. Paid access is activated only after the payment is verified, not on return from checkout.</p>
      </div>
    </section>
  );
}
