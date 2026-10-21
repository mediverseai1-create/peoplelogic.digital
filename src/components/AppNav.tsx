"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV = [
  { href: "/app", label: "Workforce Overview" },
  { href: "/app/attrition", label: "Attrition Intelligence" },
  { href: "/app/root-cause", label: "Root Cause Analysis" },
  { href: "/app/workload", label: "Workload & Capacity" },
  { href: "/app/feedback", label: "Employee Feedback" },
  { href: "/app/managers", label: "Manager Insights" },
  { href: "/app/simulator", label: "Workforce Simulator" },
  { href: "/app/cost", label: "Turnover Cost" },
  { href: "/app/reports", label: "Leadership Reports" },
  { href: "/app/ask", label: "Ask PeopleLogic" },
  { href: "/app/data", label: "Data Sources" },
  { href: "/app/team", label: "Team & Permissions" },
  { href: "/app/billing", label: "Usage & Billing" },
  { href: "/app/settings", label: "Settings" },
];

export function AppNav() {
  const path = usePathname();
  return (
    <nav aria-label="Application" className="space-y-0.5">
      {NAV.map((n) => {
        const active = n.href === "/app" ? path === "/app" : path.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-white font-medium text-plum-900 shadow-sm" : "text-charcoal-600 hover:bg-white/60 hover:text-plum-900"}`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
