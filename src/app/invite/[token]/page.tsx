import { acceptInvite } from "@/app/actions";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Accept invitation" };

export default async function Invite({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  async function accept() {
    "use server";
    const res = await acceptInvite(token);
    // acceptInvite redirects on success; reaching here means failure.
    const { redirect } = await import("next/navigation");
    redirect(`/invite/${token}?error=${encodeURIComponent(res.error ?? "failed")}`);
  }
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <Logo />
      <h1 className="mt-8 text-3xl text-plum-900">Join your organization</h1>
      <p className="mt-2 text-sm text-charcoal-600">You must be signed in with the email address the invitation was sent to.</p>
      {sp.error && <p role="alert" className="mt-3 text-sm text-signal-high">{sp.error}</p>}
      <form action={accept} className="mt-5"><button className="btn-primary">Accept invitation</button></form>
    </div>
  );
}
