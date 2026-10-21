import { Logo } from "@/components/Logo";

export const metadata = { title: "Setup required" };

export default function SetupRequired() {
  return (
    <div className="mx-auto max-w-xl px-5 py-20">
      <Logo />
      <h1 className="mt-8 text-3xl text-plum-900">Configuration required</h1>
      <p className="mt-3 text-sm text-charcoal-600">
        This deployment has no Supabase configuration yet, so sign-in and the application are unavailable. An administrator needs to set
        <code className="mx-1 rounded bg-ivory-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and
        <code className="mx-1 rounded bg-ivory-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and apply the database migration. See README.md.
      </p>
    </div>
  );
}
