// Single source of truth for status → color → label mapping.
// Every component (StatusBadge, ScoreGauge, ClaimList, ErrorCard) reads from
// here instead of maintaining its own copy of the same three colors.

export const STATUS_COLOR = {
  green: "green",
  amber: "amber",
  red: "red",
};

export const SCORE_THRESHOLDS = {
  READY: 85,
  NEEDS_REVIEW: 60,
};

export function scoreToColor(score) {
  if (score >= SCORE_THRESHOLDS.READY) return STATUS_COLOR.green;
  if (score >= SCORE_THRESHOLDS.NEEDS_REVIEW) return STATUS_COLOR.amber;
  return STATUS_COLOR.red;
}

export function scoreToLabel(score) {
  if (score >= SCORE_THRESHOLDS.READY) return "Ready for Submission";
  if (score >= SCORE_THRESHOLDS.NEEDS_REVIEW) return "Needs Review";
  return "High Risk";
}

// Hex values for SVG stroke attributes (Tailwind classes don't apply to SVG stroke).
export const HEX_BY_COLOR = {
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
};

// Tailwind class bundles keyed by semantic color, used across badge/pill UI.
export const BADGE_CLASSES = {
  green: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  amber: "bg-amber-100 text-amber-700 border border-amber-200",
  red: "bg-red-100 text-red-700 border border-red-200",
};

export const DOT_CLASSES = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export const LIST_DOT_CLASSES = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export const LIST_BADGE_CLASSES = {
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
};

export const SEVERITY_STYLES = {
  error: {
    border: "border-red-200",
    bg: "bg-red-50",
    badge: "bg-red-100 text-red-700",
    icon: "text-red-500",
  },
  warning: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
    icon: "text-amber-500",
  },
};

export const PASS_STYLE = {
  border: "border-emerald-200",
  bg: "bg-emerald-50",
  badge: "bg-emerald-100 text-emerald-700",
};

// Fields the officer is allowed to edit directly from a failing ErrorCard.
export const EDITABLE_FIELDS = [
  "diagnosis_code",
  "visit_date",
  "claimed_amount",
  "patient_id",
  "coverage_end_date",
];

