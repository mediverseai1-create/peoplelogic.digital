import { changeMemberRole, inviteMember, revokeInvitation, revokeMember } from "@/app/actions";
import { ActionForm, ConfirmButton } from "@/components/ActionForm";
import { Chip, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/context";
import { ASSIGNABLE_ROLES, ROLE_LABELS, can, type Role } from "@/lib/roles";
import { InviteForm } from "@/components/InviteForm";

export const metadata = { title: "Team & Permissions" };

export default async function TeamPage() {
  const ctx = await requireContext();
  const canManage = can(ctx.role, "manage_members");
  const [{ data: members }, { data: teams }, { data: invites }] = await Promise.all([
    ctx.supabase.from("organization_members").select("id,user_id,role,team_ids,created_at").eq("org_id", ctx.org.id).order("created_at"),
    ctx.supabase.from("teams").select("id,name").eq("org_id", ctx.org.id).order("name"),
    canManage ? ctx.supabase.from("invitations").select("id,email,role,expires_at,accepted_at,team_ids").eq("org_id", ctx.org.id).is("accepted_at", null) : Promise.resolve({ data: [] as any[] }),
  ]);
  const ids = (members ?? []).map((m: any) => m.user_id);
  const { data: profiles } = ids.length ? await ctx.supabase.from("profiles").select("id,email,full_name").in("id", ids) : { data: [] as any[] };
  const prof = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const tn = new Map((teams ?? []).map((t: any) => [t.id, t.name]));

  return (
    <>
      <PageHeader title="Team & Permissions" subtitle="Roles are enforced on the server and by row-level security, not just in the interface." />
      <div className="overflow-x-auto rounded-lg border border-ivory-300 bg-white/70">
        <table className="min-w-full text-sm">
          <thead className="border-b border-ivory-300"><tr><th className="th">Member</th><th className="th">Role</th><th className="th">Team access</th><th className="th">{canManage ? "Manage" : ""}</th></tr></thead>
          <tbody className="divide-y divide-ivory-300">
            {(members ?? []).map((m: any) => {
              const p = prof.get(m.user_id) as any;
              const self = m.user_id === ctx.user.id;
              return (
                <tr key={m.id}>
                  <td className="td">{p?.full_name || p?.email || "Member"}{self && <span className="text-xs text-charcoal-400"> (you)</span>}<div className="text-xs text-charcoal-400">{p?.email}</div></td>
                  <td className="td"><Chip tone="info">{ROLE_LABELS[m.role as Role]}</Chip></td>
                  <td className="td text-xs text-charcoal-600">{m.role === "dept_manager" ? (m.team_ids.length ? m.team_ids.map((t: string) => tn.get(t) ?? "team").join(", ") : "none assigned") : "All teams"}</td>
                  <td className="td">
                    {canManage && m.role !== "owner" && !self && (
                      <div className="flex flex-col gap-2">
                        <ActionForm action={changeMemberRole} submit="Change role" variant="secondary" className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="member" value={m.id} />
                          <select name="role" defaultValue={m.role} className="input w-auto" aria-label="Role">{ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
                          <details className="text-xs"><summary className="cursor-pointer">Teams (managers)</summary>{(teams ?? []).map((t: any) => <label key={t.id} className="block"><input type="checkbox" name="team_ids" value={t.id} defaultChecked={m.team_ids.includes(t.id)} /> {t.name}</label>)}</details>
                        </ActionForm>
                        <ConfirmButton action={revokeMember} fields={{ member: m.id }} label="Revoke access" confirm="Revoke this member's access?" />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canManage ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="text-xl text-plum-900">Invite a member</h2>
            <InviteForm teams={(teams ?? []) as { id: string; name: string }[]} action={inviteMember} />
          </div>
          <div className="card">
            <h2 className="text-xl text-plum-900">Pending invitations</h2>
            {(invites ?? []).length === 0 ? <p className="mt-2 text-sm text-charcoal-600">None.</p> : (
              <ul className="mt-2 space-y-2 text-sm">{(invites ?? []).map((i: any) => <li key={i.id} className="flex items-center justify-between gap-2"><span>{i.email} · {ROLE_LABELS[i.role as Role]} <span className="text-xs text-charcoal-400">(expires {new Date(i.expires_at).toLocaleDateString()})</span></span><ConfirmButton action={revokeInvitation} fields={{ invitation: i.id }} label="Revoke" confirm="Revoke this invitation?" /></li>)}</ul>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8"><EmptyState title="Member management" body="Only Organization Owners and Administrators can invite members or change roles." /></div>
      )}
    </>
  );
}
