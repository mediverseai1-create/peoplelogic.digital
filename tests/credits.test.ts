import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => ({ rpc }) }));

import { InsufficientCreditsError, withCredits } from "@/lib/credits";
import { AiError } from "@/lib/gemini";
import { creditCost, getEntitlements, getPlans } from "@/lib/plans";

const args = { orgId: "o", userId: "u", operation: "ask" as const };

describe("withCredits", () => {
  beforeEach(() => rpc.mockReset());

  it("reserves, runs, and finalizes successful operations with token usage", async () => {
    rpc.mockResolvedValueOnce({ data: [{ usage_id: "u1", metered: true }], error: null }).mockResolvedValueOnce({ error: null });
    const out = await withCredits(args, async () => ({ result: "ok", tokens: 42 }));
    expect(out).toBe("ok");
    expect(rpc).toHaveBeenNthCalledWith(1, "reserve_credits", expect.objectContaining({ p_org: "o", p_user: "u", p_operation: "ask", p_amount: 1 }));
    expect(rpc).toHaveBeenNthCalledWith(2, "finalize_usage", { p_usage: "u1", p_ok: true, p_tokens: 42, p_error: null });
  });

  it("blocks the operation when credits are insufficient and never runs it", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "insufficient_credits" } });
    const run = vi.fn();
    await expect(withCredits(args, run)).rejects.toBeInstanceOf(InsufficientCreditsError);
    expect(run).not.toHaveBeenCalled();
  });

  it("refunds (finalize ok=false) and rethrows when the operation fails", async () => {
    rpc.mockResolvedValueOnce({ data: [{ usage_id: "u2", metered: true }], error: null }).mockResolvedValueOnce({ error: null });
    await expect(withCredits(args, async () => { throw new AiError("down", "upstream"); })).rejects.toBeInstanceOf(AiError);
    expect(rpc).toHaveBeenNthCalledWith(2, "finalize_usage", { p_usage: "u2", p_ok: false, p_tokens: null, p_error: "upstream" });
  });
});

describe("plan configuration", () => {
  it("does not invent entitlements", () => {
    const e = getEntitlements(undefined);
    expect(e.professional.monthlyCredits).toBeNull();
    expect(e.enterprise.seatLimit).toBeNull();
  });
  it("reads configured entitlements and ignores invalid JSON", () => {
    expect(getEntitlements('{"professional":{"monthlyCredits":500}}').professional.monthlyCredits).toBe(500);
    expect(getEntitlements("not json").professional.monthlyCredits).toBeNull();
  });
  it("prices match the product spec", () => {
    const p = getPlans();
    expect(p.find((x) => x.id === "professional")!.price).toBe(47);
    expect(p.find((x) => x.id === "enterprise")!.price).toBe(97);
  });
  it("credit cost defaults to 1 and honors overrides", () => {
    expect(creditCost("ask", undefined)).toBe(1);
    expect(creditCost("report", '{"report":3}')).toBe(3);
    expect(creditCost("ask", '{"ask":-1}')).toBe(1);
  });
});
