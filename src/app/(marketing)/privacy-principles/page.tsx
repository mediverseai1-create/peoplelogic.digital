const PRINCIPLES = [
  ["Team-level, never individual", "No individual attrition-risk scores, no rankings of employees, and no inference of any person's intentions, loyalty, health or personality."],
  ["Small groups are protected", "An administrator-configurable minimum group size (conservative default, with a hard floor) suppresses or combines groups that could identify someone."],
  ["No identifiable survey output", "Respondent identifiers are not stored. Free-text comments are redacted on a best-effort basis and visible only to authorized roles."],
  ["CVs are not used to judge people", "PeopleLogic does not use CVs to infer attrition risk or make individual judgments."],
  ["Evidence is labelled", "Observed indicators, potential risk signals, model estimates, AI explanations and verified findings are kept distinct, with uncertainty and limitations shown."],
  ["Correlation is not cause", "Findings are hypotheses with alternative explanations and data needed to test them."],
  ["No automated employment decisions", "PeopleLogic never recommends firing, disciplining or penalizing individuals or managers based on model output. Leaders remain responsible for decisions."],
  ["Access controls and audit", "Role-based access, row-level security on tenant data, department-manager scoping, and an audit log of important actions."],
  ["AI with guardrails", "The assistant only sees aggregated, organization-scoped results, cannot run arbitrary queries, and says when evidence is insufficient."],
];

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
