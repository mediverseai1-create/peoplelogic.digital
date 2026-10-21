import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign in" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <h1 className="mb-4 text-center text-3xl text-plum-900">Sign in</h1>
      {sp.error && <p role="alert" className="mb-3 text-center text-sm text-signal-high">That confirmation link was invalid or expired. Please sign in or try again.</p>}
      <AuthForm mode="sign-in" next={sp.next} />
    </>
  );
}
