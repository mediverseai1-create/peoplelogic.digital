import Link from "next/link";
import { getPlans } from "@/lib/plans";

export const metadata = { title: "Pricing" };

export default function Pricing() {
  const plans = getPlans();
  return (
    <div className="mx-auto max-w-5xl px-5 py-14">
      <h1 className="text-4xl text-plum-900">Pricing</h1>
      <p className="mt-3 max-w-2xl text-charcoal-600">Two plans. Usage limits are configured per plan and shown inside the product once set.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {plans.map((p) => (
          <div key={p.id} className={`card flex flex-col ${p.id === "enterprise" ? "border-plum-700" : ""}`}>
            <h2 className="text-2xl text-plum-900">{p.name}</h2>
            <div className="mt-2 font-display text-5xl text-plum-900">${p.price}</div>
            <p className="mt-3 text-sm text-charcoal-600">{p.tagline}</p>
            <ul className="mt-4 flex-1 list-disc space-y-1 pl-5 text-sm text-charcoal-600">
              {p.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <Link href={`/sign-up?plan=${p.id}`} className={`mt-6 ${p.id === "enterprise" ? "btn-accent" : "btn-primary"}`}>Get Started</Link>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-charcoal-400">Payment is completed through an external checkout. Paid access is activated only after the payment is verified, not on return from checkout.</p>
    </div>
  );
}
