import { NextResponse } from "next/server";

/**
 * Payment webhook placeholder.
 *
 * Verification cannot be implemented safely until the payment provider and its event/signature
 * format are confirmed. Until then this endpoint refuses all requests so that nothing can
 * activate a subscription by calling it. See README ("Recording subscription status").
 */
export async function POST() {
  return NextResponse.json({ error: "Webhook verification is not configured." }, { status: 501 });
}
