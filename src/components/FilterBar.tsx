/** Server-rendered GET form: team and date-range filters that work without client JS. */
export function FilterBar({ teams, team, from, to }: { teams: { id: string; name: string }[]; team: string | null; from: string | null; to: string | null }) {
  return (
    <form method="get" className="no-print mb-5 flex flex-wrap items-end gap-3 rounded-md border border-ivory-300 bg-white/60 p-3">
      <div>
        <label className="label" htmlFor="f-team">Team</label>
        <select id="f-team" name="team" defaultValue={team ?? ""} className="input min-w-[10rem]">
          <option value="">All authorized teams</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-from">From</label>
        <input id="f-from" type="month" name="from" defaultValue={from?.slice(0, 7) ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="f-to">To</label>
        <input id="f-to" type="month" name="to" defaultValue={to?.slice(0, 7) ?? ""} className="input" />
      </div>
      <button className="btn-secondary">Apply</button>
      <a href="?" className="py-2.5 text-sm text-charcoal-600 underline">Reset</a>
    </form>
  );
}
