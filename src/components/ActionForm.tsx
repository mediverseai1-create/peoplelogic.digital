"use client";

import { useActionState, type ReactNode } from "react";
import type { State } from "@/app/actions";
import { Flash } from "./ui";

/** Form bound to a server action with pending, success and error feedback. */
export function ActionForm({
  action,
  children,
  submit,
  className = "space-y-3",
  variant = "primary",
  render,
}: {
  action: (prev: State, fd: FormData) => Promise<State>;
  children: ReactNode;
  submit: string;
  className?: string;
  variant?: "primary" | "secondary" | "accent" | "danger";
  render?: (state: State) => ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {} as State);
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && <Flash kind="error">{state.error}</Flash>}
      {state.ok && state.ok !== "answered" && <Flash kind="ok">{state.ok}</Flash>}
      {render?.(state)}
      <button className={`btn-${variant}`} disabled={pending}>
        {pending ? "Working…" : submit}
      </button>
    </form>
  );
}

/** Small inline form that posts a server action with hidden fields (e.g. delete buttons). */
export function ConfirmButton({ action, fields, label, variant = "danger", confirm }: { action: (fd: FormData) => Promise<unknown>; fields: Record<string, string>; label: string; variant?: "danger" | "secondary"; confirm: string }) {
  return (
    <form
      action={async (fd) => {
        await action(fd);
      }}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button className={`btn-${variant} px-2 py-1 text-xs`}>{label}</button>
    </form>
  );
}
