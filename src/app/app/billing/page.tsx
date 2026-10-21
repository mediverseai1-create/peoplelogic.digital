import { Chip, EmptyState, Flash, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/context";
import { getPlans, paymentLinkConfigured } from "@/lib/plans";
import { can } from "@/lib/roles";

export const metadata = { title: "Usage & Billing" };

export default async function Billing({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const [{ data: sub }, { data: bal }, { data: usage }] = await Promise.all([
    ctx.supabase.from("subscriptions").select("*").eq("org_id", ctx.org.id).maybeSingle(),
    ctx.supabase.from("credit_balances").select("*").eq("org_id", ctx.org.id).maybeSingle(),
    can(ctx.role, "view_billing") ? ctx.supabase.from("usage_events").select("*").eq("org_id", ctx.org.id).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [] as any[] }),
  ]);
  const plans = getPlans();
  const active = sub?.status === "active" ? plans.find((p) => p.id === sub.plan) : null;
  const low = bal && bal.low_threshold != null && Number(bal.balance) <= Number(bal.low_threshold);

  return (
    <>
      <PageHeader title="Usage & Billing" subtitle="Plan status, AI credits and usage history." />
      {sp.checkout === "unavailable" && <Flash kind="error">The checkout link for that plan is not configured yet. Please contact your administrator.</Flash>}
      <div className="card mb-6">
        <h2 className="text-xl text-plum-900">Current plan</h2>
        {active ? <p className="mt-1 text-sm">{active.name} (${active.price}) · <Chip tone="info">active</Chip>{sub?.verified_at && <span className="text-xs text-charcoal-400"> verified {new Date(sub.verified_at).toLocaleDateString()}</span>}</p>
          : sub ? <p className="mt-1 text-sm">Plan requested: {sub.plan} · <Chip tone="warn">{String(sub.status).replace("_", " ")}</Chip></p>
          : <p className="mt-1 text-sm text-charcoal-600">No verified paid plan is recorded for this organization.</p>}
        <p className="mt-2 text-xs text-charcoal-400">Paid access is activated only after the payment is verified by a trusted server-side record. Returning from an external checkout page does not activate a plan. Automatic verification requires the payment provider&apos;s webhook to be configured and confirmed; until then, activation is recorded manually (see README).</p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {plans.map((p) => (
          <div key={p.id} className="card flex flex-col">
            <div className="flex items-baseline justify-between"><h3 className="text-2xl text-plum-900">{p.name}</h3><span className="font-display text-3xl">${p.price}</span></div>
            <p className="mt-1 text-sm text-charcoal-600">{p.tagline}</p>
            <ul className="mt-3 flex-1 list-disc pl-5 text-sm text-charcoal-600">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <p className="mt-3 text-xs text-charcoal-400">Monthly credits: {p.monthlyCredits ?? "not configured"} · Seats: {p.seatLimit ?? "not configured"}</p>
            {can(ctx.role, "view_billing") && (paymentLinkConfigured(p.id)
              ? <a className="btn-accent mt-3" href={`/api/billing/checkout?plan=${p.id}`} target="_blank" rel="noopener noreferrer">Upgrade to {p.name}</a>
              : <button className="btn-secondary mt-3" disabled title="Payment link not configured">Payment link not configured</button>)}
          </div>
        ))}
      </div>

      <section className="mb-8">
        <h2 className="mb-2 text-2xl text-plum-900">AI credits</h2>
        {bal ? (
          <div className="card"><div className="font-display text-4xl text-plum-900">{Number(bal.balance).toLocaleString()}</div><p className="text-xs text-charcoal-400">credits remaining. 1 credit = 1 AI operation unless configured otherwise.</p>{low && <Flash kind="error">Credits are running low.</Flash>}</div>
        ) : <EmptyState title="Credits not configured" body="No credit balance exists for this organization, so AI usage is logged but not metered. A balance is created when entitlements are configured by an administrator." />}
      </section>

      {can(ctx.role, "view_billing") ? (
        <section>
          <h2 className="mb-2 text-2xl text-plum-900">Usage history</h2>
          {(usage ?? []).length === 0 ? <p className="text-sm text-charcoal-600">No AI usage recorded yet.</p> : (
            <div className="overflow-x-auto rounded-lg border border-ivory-300 bg-white/70">
              <table className="min-w-full text-sm"><thead className="border-b border-ivory-300"><tr><th className="th">When</th><th className="th">Operation</th><th className="th">Model</th><th className="th">Tokens</th><th className="th">Credits</th><th className="th">Status</th></tr></thead>
                <tbody className="divide-y divide-ivory-300">{(usage ?? []).map((u: any) => <tr key={u.id}><td className="td">{new Date(u.created_at).toLocaleString()}</td><td className="td">{u.operation}</td><td className="td">{u.model ?? "—"}</td><td className="td">{u.tokens_used ?? "—"}</td><td className="td">{Number(u.credits_charged)}</td><td className="td">{u.status}{u.error_category ? ` (${u.error_category})` : ""}</td></tr>)}</tbody></table>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
