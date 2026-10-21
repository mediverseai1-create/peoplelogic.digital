export type PlanId = "professional" | "enterprise";

export interface PlanDef {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  /** Configurable via PLAN_ENTITLEMENTS env; null means "not configured" (no invented limits). */
  monthlyCredits: number | null;
  seatLimit: number | null;
}

const BASE: Record<PlanId, Omit<PlanDef, "monthlyCredits" | "seatLimit">> = {
  professional: {
    id: "professional",
    name: "Professional",
    price: 47,
    tagline: "For growing teams that need workforce intelligence and practical retention recommendations.",
    features: [
      "Team-level risk signals",
      "Employee feedback analysis",
      "Workload and capacity insights",
      "Root cause hypotheses with evidence",
      "Retention recommendations and intervention tracking",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 97,
    tagline: "For organizations needing advanced workforce analysis, scenario planning and executive reporting.",
    features: [
      "Everything in Professional",
      "Workforce scenario planning",
      "Executive leadership reporting",
      "Team collaboration and role-based access",
      "Broader usage limits (as configured)",
    ],
  },
};

export function getEntitlements(raw: string | undefined = process.env.PLAN_ENTITLEMENTS): Record<PlanId, { monthlyCredits: number | null; seatLimit: number | null }> {
  const empty = { monthlyCredits: null, seatLimit: null };
  const out: Record<PlanId, { monthlyCredits: number | null; seatLimit: number | null }> = { professional: { ...empty }, enterprise: { ...empty } };
  if (!raw) return out;
  try {
    const parsed = JSON.parse(raw);
    for (const id of ["professional", "enterprise"] as PlanId[]) {
      const p = parsed?.[id];
      if (p && typeof p === "object") {
        out[id] = {
          monthlyCredits: Number.isFinite(p.monthlyCredits) ? Number(p.monthlyCredits) : null,
          seatLimit: Number.isFinite(p.seatLimit) ? Number(p.seatLimit) : null,
        };
      }
    }
  } catch {
    /* invalid JSON: fall back to unconfigured */
  }
  return out;
}

export function getPlans(): PlanDef[] {
  const ent = getEntitlements();
  return (["professional", "enterprise"] as PlanId[]).map((id) => ({ ...BASE[id], ...ent[id] }));
}

/** Presentation-only: tells the UI whether a checkout link is configured. The link itself stays server-side. */
export function paymentLinkConfigured(plan: PlanId): boolean {
  const v = plan === "professional" ? process.env.PROFESSIONAL_PAYMENT_LINK : process.env.ENTERPRISE_PAYMENT_LINK;
  return !!v && /^https:\/\//i.test(v);
}

export type CreditOperation = "ask" | "report" | "feedback_analysis" | "scenario_explain";

/**
 * Internal credit conversion: 1 credit per AI operation by default. Override per operation with the
 * CREDIT_COSTS env var (JSON). This is an internal accounting unit, not a token or currency price.
 */
export function creditCost(op: CreditOperation, raw: string | undefined = process.env.CREDIT_COSTS): number {
  if (raw) {
    try {
      const v = JSON.parse(raw)?.[op];
      if (Number.isFinite(v) && v >= 0) return Number(v);
    } catch {
      /* ignore */
    }
  }
  return 1;
}
