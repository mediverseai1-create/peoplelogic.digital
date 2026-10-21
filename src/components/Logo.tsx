import Link from "next/link";

/** Typographic wordmark: no third-party assets. The two dots echo a team (people) joined by a line (logic). */
export function Logo({ dark = false, href = "/" }: { dark?: boolean; href?: string }) {
  const ink = dark ? "#faf6ef" : "#2e1a2c";
  return (
    <Link href={href} className="inline-flex items-center gap-2" aria-label="PeopleLogic home">
      <svg width="26" height="22" viewBox="0 0 26 22" aria-hidden="true">
        <circle cx="5" cy="11" r="4" fill="#b8654a" />
        <circle cx="21" cy="11" r="4" fill={ink} />
        <path d="M9 11h8" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="font-display text-xl" style={{ color: ink }}>
        People<span className="italic">logic</span>
      </span>
    </Link>
  );
}
