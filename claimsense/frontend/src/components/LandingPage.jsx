import PropTypes from "prop-types";
import ScoreGauge from "./ScoreGauge.jsx";

const STEPS = [
  { n: "01", title: "Select", body: "Pick a claim with a red or amber dot from the queue." },
  { n: "02", title: "Validate", body: "Run it through 7 SHA rules and get an AI explanation of every failure." },
  { n: "03", title: "Correct", body: "Fix flagged fields inline, right inside the error card." },
  { n: "04", title: "Submit", body: "Once the score hits Ready, POST the FHIR ClaimResponse to openIMIS." },
];

/**
 * First-launch welcome screen styled in a clean light-mode theme.
 * Displays a queue score summary gauge using real claim data.
 */
export default function LandingPage({ claims, loading, onEnter }) {
  const total = claims.length;
  const ready = claims.filter((c) => c._preview?.color === "green").length;
  const review = claims.filter((c) => c._preview?.color === "amber").length;
  const highRisk = claims.filter((c) => c._preview?.color === "red").length;
  const avgScore = total
    ? Math.round(
        claims.reduce((sum, c) => sum + (c._preview?.score ?? 0), 0) / total
      )
    : 0;

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-800 flex flex-col overflow-y-auto font-sans antialiased">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-10 max-w-4xl mx-auto">
        
        {/* Branding Wordmark */}
        <div className="flex items-center gap-2.5">
          <span className="text-teal-600 font-bold text-2xl tracking-tight">
            ClaimSense
          </span>
          <span className="text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-100 rounded-md px-2 py-0.5 shadow-sm">
            SHA Pre-submission Validator
          </span>
        </div>

        {/* Hero Copy */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-850">
            AI-Powered Claims Pre-Submission Check
          </h1>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            ClaimSense audits patient claims against State Health Authority (SHA) policies and openIMIS constraints before ledger post. Get plain-English AI explanations of errors and fix data instantly.
          </p>
        </div>

        {/* Live Queue Snapshot Summary Card */}
        <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-center gap-8">
          {loading ? (
            <div className="py-4 text-sm font-semibold text-slate-400">Loading live claims queue snapshot...</div>
          ) : total === 0 ? (
            <div className="py-4 text-sm font-semibold text-slate-400">No active claims in pre-submission queue.</div>
          ) : (
            <>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Queue Average Score</span>
                <ScoreGauge score={avgScore} />
              </div>
              <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-8 flex-1 w-full">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5">Queue Status Triage</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Claims</span>
                    <strong className="text-xl font-extrabold text-slate-700">{total}</strong>
                  </div>
                  <div className="bg-emerald-50/40 border border-emerald-100/60 p-3 rounded-xl">
                    <span className="text-[10px] text-emerald-600/80 uppercase block font-semibold">Ready</span>
                    <strong className="text-xl font-extrabold text-emerald-600">{ready}</strong>
                  </div>
                  <div className="bg-amber-50/40 border border-amber-100/60 p-3 rounded-xl">
                    <span className="text-[10px] text-amber-600/80 uppercase block font-semibold">Review</span>
                    <strong className="text-xl font-extrabold text-amber-600">{review}</strong>
                  </div>
                  <div className="bg-red-50/40 border border-red-100/60 p-3 rounded-xl col-span-3">
                    <span className="text-[10px] text-red-600/80 uppercase block font-semibold">High Risk Errors</span>
                    <strong className="text-xl font-extrabold text-red-600">{highRisk}</strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onEnter}
          className="bg-teal-600 hover:bg-teal-700 active:scale-95 transition-all text-white font-bold px-8 py-3.5 rounded-xl text-sm shadow-md"
        >
          Open Adjudication Dashboard →
        </button>

        {/* 4-Step Journey */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 w-full pt-4">
          {STEPS.map((step) => (
            <div key={step.n} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm text-left">
              <span className="text-teal-600 text-xs font-mono font-bold block mb-1">{step.n}</span>
              <h4 className="text-xs font-bold text-slate-800 mb-1">{step.title}</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="px-6 py-4 text-center text-[10px] text-slate-400 font-semibold border-t border-slate-100 bg-white mt-auto">
        openIMIS Hackathon • Track 3 — Claims Management & Fraud Detection
      </footer>
    </div>
  );
}

LandingPage.propTypes = {
  claims: PropTypes.arrayOf(
    PropTypes.shape({
      _preview: PropTypes.shape({
        color: PropTypes.string,
        score: PropTypes.number,
      }),
    })
  ).isRequired,
  loading: PropTypes.bool,
  onEnter: PropTypes.func.isRequired,
};

