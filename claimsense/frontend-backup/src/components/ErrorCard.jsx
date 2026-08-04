import PropTypes from "prop-types";
import { CheckIcon, ErrorIcon, WarnIcon } from "./icons.jsx";
import { EDITABLE_FIELDS, PASS_STYLE, SEVERITY_STYLES } from "../constants/status.js";

/**
 * Renders one validation rule result — passed or failed.
 * Failing cards show the AI's plain-English explanation and, where the
 * underlying field is safely editable, an inline correction input.
 */
export default function ErrorCard({ result, explanation, fieldValue, onChange }) {
  const { passed, severity, rule_id: ruleId, message, field } = result;

  if (passed) {
    return (
      <div
        className={`rounded-xl border p-4 flex items-center gap-3 shadow-sm transition-all ${PASS_STYLE.border} ${PASS_STYLE.bg}`}
      >
        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <span className="text-sm font-semibold text-emerald-800">{message}</span>
        <span
          className={`ml-auto text-[10px] font-mono font-bold rounded-lg px-2.5 py-0.5 border ${PASS_STYLE.badge}`}
        >
          {ruleId}
        </span>
      </div>
    );
  }

  const styles = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.error;
  const canEdit = Boolean(field) && EDITABLE_FIELDS.includes(field) && field !== "multiple";
  const inputId = `field-${ruleId}`;

  return (
    <div className={`rounded-xl border p-5 shadow-sm transition-all bg-white ${styles.border}`}>
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-start gap-2.5">
          {severity === "error" ? (
            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ErrorIcon className={`w-3.5 h-3.5 ${styles.icon}`} />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <WarnIcon className={`w-3.5 h-3.5 ${styles.icon}`} />
            </div>
          )}
          <span className="text-sm font-bold text-slate-800 leading-tight">{message}</span>
        </div>
        <span
          className={`text-[10px] font-mono font-bold rounded-lg px-2.5 py-0.5 flex-shrink-0 border ${styles.badge}`}
        >
          {ruleId}
        </span>
      </div>

      {/* AI's plain-English explanation of the failure */}
      {explanation && (
        <div className="pl-7 mt-2 mb-3 bg-slate-50 border border-slate-100/80 rounded-lg p-3">
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block mb-1">AI Explanation</span>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">{explanation}</p>
        </div>
      )}

      {/* Inline correction input for fixable fields */}
      {canEdit && onChange && (
        <div className="pl-7 mt-3">
          <label htmlFor={inputId} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Correct field: <code className="bg-slate-100 rounded px-1.5 py-0.5 text-slate-600 font-mono text-[9px] lowercase">{field.replace(/_/g, " ")}</code>
          </label>
          <input
            id={inputId}
            type="text"
            value={fieldValue ?? ""}
            onChange={(e) => onChange(field, e.target.value)}
            className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-inner"
            placeholder={`Enter correct ${field.replace(/_/g, " ")}...`}
          />
        </div>
      )}
    </div>
  );
}

ErrorCard.propTypes = {
  result: PropTypes.shape({
    rule_id: PropTypes.string.isRequired,
    passed: PropTypes.bool.isRequired,
    severity: PropTypes.oneOf(["error", "warning"]),
    field: PropTypes.string,
    message: PropTypes.string.isRequired,
  }).isRequired,
  explanation: PropTypes.string,
  fieldValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
};

