import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient, supabaseConfigured } from "./supabase/server";
import { can, type Permission, type Role } from "./roles";

export interface OrgRow {
  id: string;
  name: string;
  industry: string | null;
  size_band: string | null;
  min_group_size: number;
  retention_days: number;
  onboarding_step: number;
  onboarding_done: boolean;
}

export interface AppContext {
  supabase: SupabaseClient;
  user: User;
  org: OrgRow;
  role: Role;
  teamIds: string[];
  orgs: { id: string; name: string }[];
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
  }
}

/** Resolve the signed-in user's active organization and role. Redirects when unauthenticated or un-onboarded. */
export async function getAppContext(opts: { allowNoOrg?: boolean } = {}): Promise<AppContext | null> {
  if (!supabaseConfigured()) redirect("/setup-required");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("role, team_ids, org:organizations(id,name,industry,size_band,min_group_size,retention_days,onboarding_step,onboarding_done)")
    .eq("user_id", user.id);

  const rows = (memberships ?? []) as unknown as { role: Role; team_ids: string[]; org: OrgRow }[];
  if (rows.length === 0) {
    if (opts.allowNoOrg) return null;
    redirect("/onboarding");
  }
  const store = await cookies();
  const wanted = store.get("pl_org")?.value;
  const active = rows.find((r) => r.org.id === wanted) ?? rows[0];
  return {
    supabase,
    user,
    org: active.org,
    role: active.role,
    teamIds: active.team_ids ?? [],
    orgs: rows.map((r) => ({ id: r.org.id, name: r.org.name })),
  };
}

export async function requireContext(): Promise<AppContext> {
  return (await getAppContext())!;
}

/** Server-side authorization check. UI hiding is cosmetic; this is the control. */
export function requirePermission(ctx: Pick<AppContext, "role">, permission: Permission): void {
  if (!can(ctx.role, permission)) throw new ForbiddenError();
}

export async function audit(ctx: AppContext, action: string, entity: string, detail: Record<string, unknown> = {}) {
  await ctx.supabase.rpc("log_audit", { p_org: ctx.org.id, p_action: action, p_entity: entity, p_detail: detail });
}
