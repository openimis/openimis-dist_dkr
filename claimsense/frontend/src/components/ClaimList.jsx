import PropTypes from "prop-types";
import { LIST_BADGE_CLASSES, LIST_DOT_CLASSES } from "../constants/status.js";

/**
 * Left sidebar: scrollable queue of claims styled as a clean light-mode card list.
 * Each card shows patient name, facility, visit date, claim ID, color-coded triage dot,
 * and the pre-validation score.
 */
export default function ClaimList({ claims, selectedId, onSelect, loading }) {
  if (loading) {
    return (
      <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading claims">
        {[...Array(5)].map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="h-20 bg-slate-100 border border-slate-200/60 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!claims.length) {
    return (
      <div className="p-8 text-slate-400 text-sm text-center font-medium">No claims in queue.</div>
    );
  }

  return (
    <ul className="space-y-2 p-3">
      {claims.map((claim) => {
        const preview = claim._preview ?? {};
        const isSelected = claim.id === selectedId;
        const dotColor = preview.color ?? "red";
        const dotClass = LIST_DOT_CLASSES[dotColor] ?? LIST_DOT_CLASSES.red;
        const badgeClass = LIST_BADGE_CLASSES[dotColor] ?? LIST_BADGE_CLASSES.red;

        return (
          <li key={claim.id}>
            <button
              type="button"
              onClick={() => onSelect(claim.id)}
              aria-current={isSelected ? "true" : undefined}
              className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 block shadow-sm ${
                isSelected
                  ? "bg-teal-50/50 border-teal-500 ring-1 ring-teal-500/50"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 active:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Visual pre-score status indicator dot */}
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`}
                  aria-hidden="true"
                />
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${
                    isSelected ? "text-teal-900" : "text-slate-800"
                  }`}>
                    {claim.patient_name || "Unknown Patient"}
                  </p>
                  
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {claim.facility_name || "Unknown Facility"}
                  </p>
                  
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
                      {claim.id}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {claim.visit_date}
                    </span>
                  </div>
                </div>

                {preview.score !== undefined && (
                  <span
                    className={`flex-shrink-0 text-xs font-bold rounded-lg px-2 py-1 shadow-sm border ${badgeClass}`}
                  >
                    {preview.score}
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

ClaimList.propTypes = {
  claims: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      patient_name: PropTypes.string,
      facility_name: PropTypes.string,
      visit_date: PropTypes.string,
      _preview: PropTypes.shape({
        score: PropTypes.number,
        color: PropTypes.string,
      }),
    })
  ).isRequired,
  selectedId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

