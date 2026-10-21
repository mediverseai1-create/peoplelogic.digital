import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ASSIGNABLE_ROLES, PERMISSIONS, ROLES, can } from "@/lib/roles";
import { requirePermission } from "@/lib/context";

describe("role permissions", () => {
  it("department managers and executive viewers cannot import data, see feedback, or manage members", () => {
    for (const r of ["dept_manager", "exec_viewer"] as const) {
      expect(can(r, "import_data")).toBe(false);
      expect(can(r, "view_feedback")).toBe(false);
      expect(can(r, "manage_members")).toBe(false);
    }
  });
  it("only the owner can delete organization data", () => {
    expect(ROLES.filter((r) => can(r, "delete_org_data"))).toEqual(["owner"]);
  });
  it("ownership cannot be granted by invitation", () => {
    expect(ASSIGNABLE_ROLES).not.toContain("owner");
  });
  it("requirePermission throws for a missing permission", () => {
    expect(() => requirePermission({ role: "exec_viewer" }, "import_data")).toThrow();
    expect(() => requirePermission({ role: "admin" }, "import_data")).not.toThrow();
  });
  it("every role has a permission set", () => {
    for (const r of ROLES) expect(PERMISSIONS[r].length).toBeGreaterThan(0);
  });
});

describe("tenant isolation (static check of the migration)", () => {
  const sql = readFileSync(path.join(__dirname, "../supabase/migrations/0001_core_schema.sql"), "utf8");

  const tenantTables = [...sql.matchAll(/create table if not exists (\w+) \(([\s\S]*?)\n\);/g)]
    .filter((m) => /org_id uuid not null references organizations|id uuid primary key references auth\.users|org_id uuid primary key references organizations/.test(m[2]))
    .map((m) => m[1]);

  it("finds the expected number of tenant tables", () => {
    expect(tenantTables.length).toBeGreaterThanOrEqual(33);
  });

  it("enables row level security on every tenant-owned table", () => {
    const explicit = new Set([...sql.matchAll(/alter table (\w+) enable row level security/g)].map((m) => m[1]));
    const looped = new Set([...sql.matchAll(/array\[((?:'\w+',?\s*)+)\]/g)].flatMap((m) => [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1])));
    const missing = tenantTables.filter((t) => !explicit.has(t) && !looped.has(t));
    expect(missing).toEqual([]);
  });

  it("restricts credit functions to the service role", () => {
    expect(sql).toMatch(/revoke all on function reserve_credits[\s\S]*from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function reserve_credits[\s\S]*to service_role/);
  });

  it("gives clients no write policies on billing, usage and audit tables", () => {
    expect(sql).not.toMatch(/create policy \w+ on (subscriptions|usage_events|audit_logs|credit_balances) for (insert|update|delete|all)/);
  });

  it("does not create a client-readable credentials policy for integrations", () => {
    expect(sql).not.toMatch(/create policy \w+ on integration_connections for (insert|update|delete|all)/);
  });
});
