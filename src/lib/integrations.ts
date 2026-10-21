/**
 * Integration registry. Third-party connectors are intentionally NOT implemented yet:
 * they need provider credentials, API access and scopes that have not been supplied.
 * Each provider implements `Connector`; until one is registered with `implemented: true`
 * (and tested) the UI must label it "Coming soon" and never claim it is live.
 */
export interface Connector {
  id: string;
  name: string;
  category: string;
  implemented: boolean;
  /** Future: fetch aggregated team-level data using credentials stored server-side (encrypted). */
  sync?: (orgId: string) => Promise<{ rows: number }>;
}

export const CONNECTORS: Connector[] = [
  { id: "bamboohr", name: "BambooHR", category: "HRIS", implemented: false },
  { id: "workday", name: "Workday", category: "HRIS", implemented: false },
  { id: "rippling", name: "Rippling", category: "HRIS", implemented: false },
  { id: "survey_tools", name: "Survey tools", category: "Engagement", implemented: false },
  { id: "jira", name: "Jira", category: "Workload", implemented: false },
  { id: "asana", name: "Asana", category: "Workload", implemented: false },
];

export const connectorStatus = (c: Connector) => (c.implemented ? "Connect integration" : "Coming soon");
