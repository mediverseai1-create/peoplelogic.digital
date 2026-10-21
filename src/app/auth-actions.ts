"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

const creds = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters."),
});

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/app";
}

async function origin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export async function signIn(_: unknown, fd: FormData): Promise<{ error?: string; notice?: string }> {
  if (!supabaseConfigured()) redirect("/setup-required");
  const parsed = creds.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Email or password is incorrect." };
  redirect(safeNext(fd.get("next")));
}

export async function signUp(_: unknown, fd: FormData): Promise<{ error?: string; notice?: string }> {
  if (!supabaseConfigured()) redirect("/setup-required");
  const parsed = creds.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const fullName = String(fd.get("full_name") ?? "").trim().slice(0, 120);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { data: { full_name: fullName }, emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: "We could not create that account. If you already have one, sign in instead." };
  if (!data.session) return { notice: "Check your email to confirm your address, then sign in." };
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
