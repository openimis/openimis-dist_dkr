import PropTypes from "prop-types";
import { BADGE_CLASSES, DOT_CLASSES } from "../constants/status.js";

/**
 * Colored status pill: "Ready for Submission", "Needs Review", or "High Risk".
 * Pure/presentational — takes status text + a semantic color key, renders itself.
 */
export default function StatusBadge({ status, color, small = false }) {
  const pill = BADGE_CLASSES[color] ?? BADGE_CLASSES.red;
  const dot = DOT_CLASSES[color] ?? DOT_CLASSES.red;
  const size = small ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${pill} ${size}`}
      role="status"
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  color: PropTypes.oneOf(["green", "amber", "red"]).isRequired,
  small: PropTypes.bool,
};
