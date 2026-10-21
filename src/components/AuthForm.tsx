"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "@/app/auth-actions";

export function AuthForm({ mode, next }: { mode: "sign-in" | "sign-up"; next?: string }) {
  const [state, action, pending] = useActionState(mode === "sign-in" ? signIn : signUp, {} as { error?: string; notice?: string });
  return (
    <form action={action} className="card space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "sign-up" && (
        <div>
          <label className="label" htmlFor="full_name">Full name</label>
          <input id="full_name" name="full_name" className="input" autoComplete="name" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={10} className="input" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} />
        {mode === "sign-up" && <p className="mt-1 text-xs text-charcoal-400">At least 10 characters.</p>}
      </div>
      {state.error && <p role="alert" className="text-sm text-signal-high">{state.error}</p>}
      {state.notice && <p role="status" className="text-sm text-signal-ok">{state.notice}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}</button>
      <p className="text-center text-sm text-charcoal-600">
        {mode === "sign-in" ? (
          <>New to PeopleLogic? <Link className="underline" href="/sign-up">Get Started</Link></>
        ) : (
          <>Already have an account? <Link className="underline" href="/sign-in">Sign in</Link></>
        )}
      </p>
    </form>
  );
}
