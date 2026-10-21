export const metadata = { title: "Terms of service" };

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-5 py-14 text-sm leading-relaxed text-charcoal-600">
      <h1 className="text-4xl text-plum-900">Terms of service</h1>
      <p className="rounded-md border border-signal-watch/40 bg-signal-watch/10 p-3 text-signal-watch">
        Template notice: these terms must be reviewed and completed by qualified legal counsel before commercial launch.
      </p>
      <h2 className="text-xl text-plum-900">Decision support only</h2>
      <p>PeopleLogic provides decision-support information. Outputs are descriptive indicators, estimates and AI-generated hypotheses that may be incomplete or wrong. You are responsible for evaluating them and for any decisions you make.</p>
      <h2 className="text-xl text-plum-900">Acceptable use</h2>
      <p>You may not use PeopleLogic to monitor, rank or make automated employment decisions about individual employees, to infer private characteristics, or to upload data you are not authorized to process.</p>
      <h2 className="text-xl text-plum-900">Payments</h2>
      <p>Paid plans are purchased through an external checkout. Plan access is activated after payment verification.</p>
      <h2 className="text-xl text-plum-900">No guarantees</h2>
      <p>We do not guarantee any particular business outcome, cost saving or the prediction of any resignation.</p>
    </div>
  );
}
