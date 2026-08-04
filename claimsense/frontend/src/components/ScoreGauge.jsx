import PropTypes from "prop-types";
import { HEX_BY_COLOR, scoreToColor, scoreToLabel } from "../constants/status.js";

const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 282.74

/**
 * SVG circular gauge showing the validation score 0-100.
 * The arc fills proportionally and its color shifts with the score band.
 */
export default function ScoreGauge({ score }) {
  const color = HEX_BY_COLOR[scoreToColor(score)];
  const filled = (score / 100) * CIRCUMFERENCE;
  const offset = CIRCUMFERENCE - filled;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        viewBox="0 0 120 120"
        className="w-28 h-28"
        role="img"
        aria-label={`Validation score: ${score} out of 100, ${scoreToLabel(score)}`}
      >
        {/* Gray background track */}
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        {/* Colored score arc — starts from the top (rotated -90°) */}
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          className="score-arc"
        />
        <text
          x="60"
          y="55"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="26"
          fontWeight="600"
          fill={color}
          fontFamily="Inter, sans-serif"
        >
          {score}
        </text>
        <text
          x="60"
          y="74"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fill="#94a3b8"
          fontFamily="Inter, sans-serif"
        >
          / 100
        </text>
      </svg>
      <p className="text-sm text-slate-500">{scoreToLabel(score)}</p>
    </div>
  );
}

ScoreGauge.propTypes = {
  score: PropTypes.number.isRequired,
};
