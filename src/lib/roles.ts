export const ROLES = ["owner", "admin", "hr_director", "people_analyst", "dept_manager", "exec_viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Organization Owner",
  admin: "Administrator",
  hr_director: "HR Director",
  people_analyst: "People Analyst",
  dept_manager: "Department Manager",
  exec_viewer: "Executive Viewer",
};

export type Permission =
  | "view_overview"
  | "import_data"
  | "view_feedback"
  | "manage_interventions"
  | "run_analysis"
  | "edit_cost_models"
  | "save_scenarios"
  | "generate_reports"
  | "use_assistant"
  | "manage_members"
  | "manage_settings"
  | "view_audit"
  | "view_billing"
  | "delete_org_data";

const ANALYST: Permission[] = [
  "view_overview", "import_data", "view_feedback", "manage_interventions", "run_analysis",
  "edit_cost_models", "save_scenarios", "generate_reports", "use_assistant",
];

export const PERMISSIONS: Record<Role, Permission[]> = {
  owner: [...ANALYST, "manage_members", "manage_settings", "view_audit", "view_billing", "delete_org_data"],
  admin: [...ANALYST, "manage_members", "manage_settings", "view_audit", "view_billing"],
  hr_director: [...ANALYST, "view_audit", "view_billing"],
  people_analyst: ANALYST,
  dept_manager: ["view_overview", "manage_interventions", "use_assistant"],
  exec_viewer: ["view_overview", "generate_reports", "use_assistant"],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return !!role && PERMISSIONS[role].includes(permission);
}

/** Roles an owner/admin may assign. Ownership cannot be granted through invitations. */
export const ASSIGNABLE_ROLES: Role[] = ["admin", "hr_director", "people_analyst", "dept_manager", "exec_viewer"];
