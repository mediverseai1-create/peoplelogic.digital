import { signOut } from "@/app/auth-actions";
import { switchOrg } from "@/app/actions";
import { AppNav } from "@/components/AppNav";
import { Logo } from "@/components/Logo";
import { requireContext } from "@/lib/context";
import { ROLE_LABELS } from "@/lib/roles";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  if (!ctx.org.onboarding_done && ["owner", "admin"].includes(ctx.role)) redirect("/onboarding");
  return (
    <div className="min-h-screen md:flex">
      <aside className="no-print border-r border-ivory-300 bg-ivory-100 px-4 py-5 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto">
        <Logo href="/app" />
        {ctx.orgs.length > 1 ? (
          <form action={switchOrg} className="mt-5">
            <label className="sr-only" htmlFor="org">Organization</label>
            <select id="org" name="org" defaultValue={ctx.org.id} className="input">
              {ctx.orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <button className="mt-2 text-xs text-charcoal-600 underline">Switch organization</button>
          </form>
        ) : (
          <div className="mt-5 text-sm font-medium text-plum-900">{ctx.org.name}</div>
        )}
        <div className="mb-5 text-xs text-charcoal-400">{ROLE_LABELS[ctx.role]}</div>
        <AppNav />
        <form action={signOut} className="mt-6">
          <button className="text-xs text-charcoal-600 underline hover:text-plum-900">Sign out</button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
