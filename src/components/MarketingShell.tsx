import Link from "next/link";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/capabilities", label: "Capabilities" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/privacy-principles", label: "Privacy & responsible AI" },
  { href: "/pricing", label: "Pricing" },
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ivory-300 bg-ivory">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Logo />
          <nav aria-label="Main" className="hidden gap-6 text-sm text-charcoal-600 md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-plum-900">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="btn-secondary hidden sm:inline-flex">Sign in</Link>
            <Link href="/sign-up" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-ivory-300 bg-plum-950 text-ivory-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-6 px-5 py-10 text-sm">
          <div className="max-w-sm">
            <Logo dark />
            <p className="mt-3 text-ivory-300">Understand workforce risk before it becomes employee turnover. A decision-support tool: human leaders remain responsible for decisions.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {[...LINKS, { href: "/privacy", label: "Privacy policy" }, { href: "/terms", label: "Terms of service" }].map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-white">{l.label}</Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
