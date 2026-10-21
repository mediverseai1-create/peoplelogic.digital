export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-5 py-14 text-sm leading-relaxed text-charcoal-600">
      <h1 className="text-4xl text-plum-900">Privacy policy</h1>
      <p className="rounded-md border border-signal-watch/40 bg-signal-watch/10 p-3 text-signal-watch">
        Template notice: this document describes product behavior and must be reviewed and completed by qualified legal counsel (entity name, contact, jurisdictions, processors, retention) before commercial launch.
      </p>
      <h2 className="text-xl text-plum-900">What we process</h2>
      <p>Account details (email, name), organization settings, and the aggregated workforce data your organization chooses to import (team-level counts, hours, costs and survey results).</p>
      <h2 className="text-xl text-plum-900">What we ask you not to upload</h2>
      <p>Names, employee IDs, email addresses or other direct identifiers of employees or survey respondents. Survey identifier columns are not stored, and free-text comments are redacted on a best-effort basis.</p>
      <h2 className="text-xl text-plum-900">AI processing</h2>
      <p>When you use AI features, aggregated and minimized team-level context is sent to Google&apos;s Gemini API from our servers to produce explanations. Individual-level employee records are not sent where aggregates suffice.</p>
      <h2 className="text-xl text-plum-900">Your controls</h2>
      <p>Organization administrators can set the minimum group size and retention period, export data, and owners can delete organization data. Actions are recorded in an audit log.</p>
      <h2 className="text-xl text-plum-900">Your responsibilities</h2>
      <p>You are responsible for having a lawful basis, notices and any required consents for the data you import, and for complying with applicable privacy and employment laws.</p>
    </div>
  );
}
