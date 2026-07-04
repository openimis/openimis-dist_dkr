"""
Runs all validation rules against a claim and produces a structured result.

Score calculation:
  Start at 100.
  Each failed error rule:   -20 points
  Each failed warning rule: -10 points
  Floor at 0.

Status thresholds:
  85-100 → Ready for Submission
  60-84  → Needs Review
  0-59   → High Risk — Errors Found
"""

from typing import List
from .rules import ALL_RULES, RuleResult


_DEDUCTIONS = {"error": 20, "warning": 10}


def _compute_score(results: List[RuleResult]) -> int:
    deductions = sum(
        _DEDUCTIONS.get(r.severity, 0)
        for r in results
        if not r.passed
    )
    return max(0, 100 - deductions)


def _score_to_status(score: int) -> str:
    if score >= 85:
        return "Ready for Submission"
    if score >= 60:
        return "Needs Review"
    return "High Risk — Errors Found"


def _score_to_color(score: int) -> str:
    if score >= 85:
        return "green"
    if score >= 60:
        return "amber"
    return "red"


def validate(claim: dict) -> dict:
    """
    Run all rules against a claim. Returns everything the API and frontend need.
    This is the only function the rest of the app calls.
    """
    results = [rule(claim) for rule in ALL_RULES]
    score = _compute_score(results)

    errors = [r for r in results if not r.passed and r.severity == "error"]
    warnings = [r for r in results if not r.passed and r.severity == "warning"]

    return {
        "claim_id": claim.get("id"),
        "score": score,
        "status": _score_to_status(score),
        "color": _score_to_color(score),
        "passed": len(errors) == 0,
        "error_count": len(errors),
        "warning_count": len(warnings),
        "results": [r.to_dict() for r in results],
        "errors": [r.to_dict() for r in errors],
        "warnings": [r.to_dict() for r in warnings],
    }
