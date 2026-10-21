import { NextResponse, type NextRequest } from "next/server";
import { audit, getAppContext, requirePermission } from "@/lib/context";

/**
 * Redirects an authorized user to the externally configured payment link.
 * This does NOT grant access: activation requires verified server-side confirmation.
 * No personal data is appended to the URL.
 */
export async function GET(request: NextRequest) {
  const ctx = await getAppContext();
  if (!ctx) return NextResponse.redirect(new URL("/sign-in", request.url));
  try {
    requirePermission(ctx, "view_billing");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const plan = request.nextUrl.searchParams.get("plan");
  const link = plan === "professional" ? process.env.PROFESSIONAL_PAYMENT_LINK : plan === "enterprise" ? process.env.ENTERPRISE_PAYMENT_LINK : undefined;
  if (!link || !/^https:\/\//i.test(link)) return NextResponse.redirect(new URL("/app/billing?checkout=unavailable", request.url));
  await audit(ctx, "billing.checkout_opened", "subscriptions", { plan });
  return NextResponse.redirect(link);
}
