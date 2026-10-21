import Link from "next/link";
import { redirect } from "next/navigation";
import { createOrg, finishOnboarding, inviteMember, setOnboardingStep, updateOrgSettings } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { ImportWizard } from "@/components/ImportWizard";
import { InviteForm } from "@/components/InviteForm";
import { Logo } from "@/components/Logo";
import { Flash } from "@/components/ui";
import { getBundle } from "@/lib/bundle";
import { getAppContext } from "@/lib/context";
import { can } from "@/lib/roles";

export const metadata = { title: "Onboarding" };
export const dynamic = "force-dynamic";
const STEPS = ["Organization", "Company details", "Invite team", "Import data", "Review & finish"];

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const ctx = await getAppContext({ allowNoOrg: true });
  const sp = await searchParams;

  if (!ctx) {
    return (
      <Shell step={1}>
        <h1 className="text-3xl text-plum-900">Create your organization</h1>
        <p className="mt-2 text-sm text-charcoal-600">To join an existing organization, open the invitation link an administrator sent you instead.</p>
        <ActionForm action={createOrg} submit="Create organization" className="card mt-5 space-y-3">
          <div><label className="label" htmlFor="o-name">Organization name</label><input id="o-name" name="name" required className="input" /></div>
          <div><label className="label" htmlFor="o-ind">Industry (optional)</label><input id="o-ind" name="industry" className="input" /></div>
          <div><label className="label" htmlFor="o-size">Organization size</label><select id="o-size" name="size" className="input"><option value="">Select</option>{["1-50", "51-200", "201-1000", "1001-5000", "5000+"].map((s) => <option key={s}>{s}</option>)}</select></div>
        </ActionForm>
      </Shell>
    );
  }
  if (!can(ctx.role, "manage_settings")) redirect("/app");
  if (ctx.org.onboarding_done && !sp.step) redirect("/app");

  const step = Math.min(5, Math.max(2, Number(sp.step ?? ctx.org.onboarding_step ?? 2) || 2));
  const { data: teams } = await ctx.supabase.from("teams").select("id,name").eq("org_id", ctx.org.id).order("name");

  return (
    <Shell step={step}>
      {step === 2 && (
        <>
          <h1 className="text-3xl text-plum-900">Company details & privacy</h1>
          <p className="mt-2 text-sm text-charcoal-600">Set the minimum group size that protects small teams. Reporting units (departments and teams) are created from your first import.</p>
          <ActionForm action={updateOrgSettings} submit="Save details" className="card mt-5 grid gap-3 md:grid-cols-2">
            <div><label className="label" htmlFor="n">Organization name</label><input id="n" name="name" defaultValue={ctx.org.name} className="input" required /></div>
            <div><label className="label" htmlFor="i">Industry</label><input id="i" name="industry" defaultValue={ctx.org.industry ?? ""} className="input" /></div>
            <div><label className="label" htmlFor="s">Size</label><select id="s" name="size_band" defaultValue={ctx.org.size_band ?? ""} className="input"><option value="">Select</option>{["1-50", "51-200", "201-1000", "1001-5000", "5000+"].map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label className="label" htmlFor="m">Minimum group size</label><input id="m" name="min_group_size" type="number" min={5} max={200} defaultValue={ctx.org.min_group_size} className="input" /></div>
            <input type="hidden" name="retention_days" value={ctx.org.retention_days} />
          </ActionForm>
          <form action={setOnboardingStep.bind(null, 3)} className="mt-4"><button className="btn-primary">Continue</button></form>
        </>
      )}
      {step === 3 && (
        <>
          <h1 className="text-3xl text-plum-900">Invite your team</h1>
          <p className="mt-2 text-sm text-charcoal-600">Optional. Invitations are links you share; email delivery is not configured.</p>
          <div className="card mt-5"><InviteForm teams={(teams ?? []) as any} action={inviteMember} /></div>
          <form action={setOnboardingStep.bind(null, 4)} className="mt-4"><button className="btn-primary">Continue / skip</button></form>
        </>
      )}
      {step === 4 && (
        <>
          <h1 className="text-3xl text-plum-900">Import your first dataset</h1>
          <p className="mt-2 text-sm text-charcoal-600">Start with headcount and departures if you have them. Review the mapping and privacy checks, then import. Direct integrations are not yet available.</p>
          <div className="mt-5"><ImportWizard /></div>
          <form action={setOnboardingStep.bind(null, 5)} className="mt-4"><button className="btn-primary">Continue</button></form>
        </>
      )}
      {step === 5 && <Finish orgId={ctx.org.id} />}
    </Shell>
  );

  async function Finish({ orgId }: { orgId: string }) {
    void orgId;
    const b = await getBundle(ctx!);
    const c = b.data.sourceCoverage;
    const items: [string, boolean, string][] = [
      ["Turnover trends and rates", c.headcount && c.turnover, "needs headcount + departures"],
      ["Workload and capacity pressure", c.workload, "needs workload data"],
      ["Vacancy / staffing gaps", c.staffing, "needs staffing data"],
      ["Employee feedback themes", c.survey, "needs survey data"],
      ["Team risk indicators", c.headcount && (c.turnover || c.workload || c.staffing), "needs headcount plus at least one more dataset"],
    ];
    return (
      <>
        <h1 className="text-3xl text-plum-900">Review & finish</h1>
        <p className="mt-2 text-sm text-charcoal-600">Here is what your current data supports. Nothing is analysed beyond what you provided.</p>
        <ul className="card mt-5 space-y-2 text-sm">{items.map(([l, ok, need]) => <li key={l} className="flex justify-between"><span>{l}</span><span className={ok ? "text-signal-ok" : "text-charcoal-400"}>{ok ? "Available" : `Not yet (${need})`}</span></li>)}</ul>
        <Flash kind="info">Safeguards active: team-level analysis only, minimum group size {ctx!.org.min_group_size}, role-based access, audit logging. No individual attrition scores are produced.</Flash>
        <form action={finishOnboarding}><button className="btn-primary">Open Workforce Overview</button></form>
        <p className="mt-3 text-xs text-charcoal-400"><Link href="/onboarding?step=4" className="underline">Back to import</Link></p>
      </>
    );
  }
}

function Shell({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Logo />
      <ol className="mt-6 flex flex-wrap gap-2 text-xs" aria-label="Onboarding progress">
        {STEPS.map((s, i) => <li key={s} aria-current={i + 1 === step ? "step" : undefined} className={`chip ${i + 1 === step ? "border-plum-900 bg-plum-900 text-ivory" : i + 1 < step ? "border-signal-ok/40 text-signal-ok" : "border-ivory-300 text-charcoal-400"}`}>{i + 1}. {s}</li>)}
      </ol>
      <div className="mt-8">{children}</div>
    </div>
  );
}
