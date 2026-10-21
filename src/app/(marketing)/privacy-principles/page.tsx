import { PRINCIPLES } from "@/lib/marketing-content";

export default function PrivacyPrinciples() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <h1 className="text-4xl text-plum-900">Privacy and responsible AI principles</h1>
      <p className="mt-3 text-charcoal-600">PeopleLogic helps leaders improve working conditions, staffing and management practices. It is not built to monitor employees.</p>
      <div className="mt-10 space-y-6">
        {PRINCIPLES.map(([t, b]) => (
          <div key={t} className="border-l-2 border-plum-600 pl-4">
            <h2 className="text-xl text-plum-900">{t}</h2>
            <p className="mt-1 text-sm text-charcoal-600">{b}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-sm text-charcoal-600">
        We do not claim certification or compliance with GDPR, NDPR, ISO 27001, SOC 2 or similar frameworks. Your organization remains responsible for lawful data collection, consent and retention.
      </p>
    </div>
  );
}
