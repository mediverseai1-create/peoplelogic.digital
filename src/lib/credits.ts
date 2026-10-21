import { createAdminClient } from "./supabase/server";
import { creditCost, type CreditOperation } from "./plans";
import { AiError } from "./gemini";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Your organization has no remaining AI credits for this operation.");
  }
}

/**
 * Reserve credits atomically (SQL function, row-level conditional UPDATE), run the operation,
 * then finalize. Failed operations are refunded. The caller MUST have verified that `userId`
 * belongs to `orgId` and holds the needed permission before calling this.
 *
 * Orgs without a credit_balances row are "unmetered" (credits not configured): usage is logged only.
 */
export async function withCredits<T>(
  args: { orgId: string; userId: string; operation: CreditOperation; model?: string },
  run: () => Promise<{ result: T; tokens: number | null; model?: string }>,
): Promise<T> {
  const admin = createAdminClient();
  if (!admin) throw new AiError("Usage tracking is not configured. Add SUPABASE_SERVICE_ROLE_KEY on the server.", "not_configured");

  const amount = creditCost(args.operation);
  const { data, error } = await admin.rpc("reserve_credits", {
    p_org: args.orgId,
    p_user: args.userId,
    p_operation: args.operation,
    p_amount: amount,
    p_model: args.model ?? null,
  });
  if (error) {
    if (error.message.includes("insufficient_credits")) throw new InsufficientCreditsError();
    throw new Error("Could not record usage. Please try again.");
  }
  const usageId = (Array.isArray(data) ? data[0] : data)?.usage_id as string;

  try {
    const out = await run();
    await admin.rpc("finalize_usage", { p_usage: usageId, p_ok: true, p_tokens: out.tokens, p_error: null });
    return out.result;
  } catch (e) {
    const category = e instanceof AiError ? e.category : "internal";
    await admin.rpc("finalize_usage", { p_usage: usageId, p_ok: false, p_tokens: null, p_error: category });
    throw e;
  }
}
