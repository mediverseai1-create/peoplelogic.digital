import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Get Started" };

export default function SignUp() {
  return (
    <>
      <h1 className="mb-4 text-center text-3xl text-plum-900">Create your account</h1>
      <AuthForm mode="sign-up" />
    </>
  );
}
