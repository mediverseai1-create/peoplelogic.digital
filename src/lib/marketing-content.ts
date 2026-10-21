export const CAPS = [
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

export const STEPS = [
  ["Create your organization", "Sign up, name your organization and set a minimum group size for privacy."],
  ["Import team-level data", "Upload CSV files for headcount, departures, staffing, workload, surveys or replacement costs. A guided workflow validates, previews and maps every column before anything is stored."],
  ["Review indicators and evidence", "PeopleLogic computes transparent indicators per team and shows the evidence, period, sample and limits behind each."],
  ["Investigate possible causes", "Review hypotheses and alternative explanations, and see what additional data would sharpen them."],
  ["Plan and simulate", "Test staffing scenarios and estimate turnover cost with formulas you can inspect."],
  ["Report and track", "Generate leadership reports, assign interventions, and record whether they helped."],
];

export const PRINCIPLES = [
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
