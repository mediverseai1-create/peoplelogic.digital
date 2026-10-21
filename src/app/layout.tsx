import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PeopleLogic — Workforce intelligence", template: "%s · PeopleLogic" },
  description:
    "PeopleLogic connects workforce, workload, engagement and organizational data to help leaders understand where teams need support, why risks may be emerging, and which interventions are worth considering.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
