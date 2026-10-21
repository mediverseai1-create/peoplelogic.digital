import { STEPS } from "@/lib/marketing-content";
import Link from "next/link";


export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <h1 className="text-4xl text-plum-900">How it works</h1>
      <ol className="mt-10 space-y-8">
        {STEPS.map(([t, b], i) => (
          <li key={t} className="flex gap-5">
            <div className="font-display text-4xl text-plum-600">{i + 1}</div>
            <div>
              <h2 className="text-xl text-plum-900">{t}</h2>
              <p className="mt-1 text-sm text-charcoal-600">{b}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-10 rounded-md border border-ivory-300 bg-ivory-100 p-4 text-sm text-charcoal-600">
        Indicators are descriptive. PeopleLogic does not claim a trained or validated attrition prediction model; where history is too thin it provides indicators and clearly labelled hypotheses only.
      </p>
      <Link href="/sign-up" className="btn-primary mt-8">Get Started</Link>
    </div>
  );
}
