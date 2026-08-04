"""
SHA claim validation rules.

Each rule is a plain function: takes a claim dict, returns a RuleResult.
Rules are deterministic and side-effect-free — easy to test in isolation.

Adding a new rule: write the function, add it to ALL_RULES at the bottom.
"""

import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional


@dataclass
class RuleResult:
    rule_id: str
    passed: bool
    severity: str          # "error" deducts 20pts, "warning" deducts 10pts
    field: Optional[str]   # which field to highlight in the frontend
    message: str           # short technical description
    suggestion: str        # what the officer should do

    def to_dict(self) -> dict:
        return {
            "rule_id": self.rule_id,
            "passed": self.passed,
            "severity": self.severity,
            "field": self.field,
            "message": self.message,
            "suggestion": self.suggestion,
        }


def _pass(rule_id: str, severity: str = "error") -> RuleResult:
    """Shorthand for a passing result — keeps rule functions readable."""
    return RuleResult(rule_id, True, severity, None, "Check passed", "")


# ---------------------------------------------------------------------------
# Rule 1 — Required fields must be present and non-empty
# ---------------------------------------------------------------------------

def rule_required_fields(claim: dict) -> RuleResult:
    required = {
        "patient_id": "Patient / Insuree ID",
        "facility_code": "Health facility code",
        "visit_date": "Date of visit",
        "diagnosis_code": "ICD-10 diagnosis code",
    }

    missing = [
        label
        for field_key, label in required.items()
        if not str(claim.get(field_key, "")).strip()
    ]

    if missing:
        return RuleResult(
            "MISSING_FIELDS",
            False,
            "error",
            "multiple",
            f"Required fields are empty: {', '.join(missing)}",
            "Fill in all highlighted fields. SHA rejects any claim missing these values.",
        )

    return _pass("MISSING_FIELDS")


# ---------------------------------------------------------------------------
# Rule 2 — ICD-10 diagnosis code must be in valid format
#          Format: one uppercase letter + two digits, optionally a dot and 1-4 chars
#          Examples: J18.9 / O80 / E11.9 / K59.0
# ---------------------------------------------------------------------------

_ICD10_PATTERN = re.compile(r"^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$")


def rule_icd10_format(claim: dict) -> RuleResult:
    code = str(claim.get("diagnosis_code", "")).strip()

    if not code:
        # Already caught by rule_required_fields — don't double-report
        return _pass("INVALID_ICD10")

    if not _ICD10_PATTERN.match(code):
        return RuleResult(
            "INVALID_ICD10",
            False,
            "error",
            "diagnosis_code",
            f'"{code}" is not a valid ICD-10 code',
            (
                "ICD-10 codes are: one letter + two digits, optionally a dot + subcode. "
                "Examples: J18.9, O80, E11.9. Check the WHO ICD-10 browser if unsure."
            ),
        )

    return _pass("INVALID_ICD10")


# ---------------------------------------------------------------------------
# Rule 3 — Visit date cannot be in the future
# ---------------------------------------------------------------------------

def rule_visit_date_valid(claim: dict) -> RuleResult:
    raw = str(claim.get("visit_date", "")).strip()

    if not raw:
        return _pass("VISIT_DATE")  # Caught by required fields

    try:
        visit = datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return RuleResult(
            "VISIT_DATE",
            False,
            "error",
            "visit_date",
            f'Visit date "{raw}" is not in YYYY-MM-DD format',
            "Use the format YYYY-MM-DD, for example 2026-07-03.",
        )

    if visit > date.today():
        days_ahead = (visit - date.today()).days
        return RuleResult(
            "VISIT_DATE",
            False,
            "error",
            "visit_date",
            f"Visit date {raw} is {days_ahead} day(s) in the future",
            "SHA only accepts claims for services already rendered. Correct the date.",
        )

    return _pass("VISIT_DATE")


# ---------------------------------------------------------------------------
# Rule 4 — Claim must have at least one item with a valid service code
# ---------------------------------------------------------------------------

def rule_items_valid(claim: dict) -> RuleResult:
    items = claim.get("items", [])

    if not items:
        return RuleResult(
            "EMPTY_ITEMS",
            False,
            "error",
            "items",
            "No service items are listed on this claim",
            "Add at least one service, procedure, or medication item with a SHA service code.",
        )

    for idx, item in enumerate(items, start=1):
        code = str(item.get("service_code", "")).strip()
        qty = item.get("quantity", 0)

        if not code:
            desc = item.get("description", f"item {idx}")
            return RuleResult(
                "EMPTY_ITEMS",
                False,
                "error",
                "items",
                f'Item {idx} ("{desc}") has no service code',
                "Every item must have a valid SHA benefit package service code.",
            )

        if not isinstance(qty, (int, float)) or qty <= 0:
            return RuleResult(
                "EMPTY_ITEMS",
                False,
                "warning",
                "items",
                f"Item {idx} has a quantity of {qty}",
                "Quantity must be a positive number.",
            )

    return _pass("EMPTY_ITEMS")


# ---------------------------------------------------------------------------
# Rule 5 — Claimed amount must be within 5% of the sum of line items
# ---------------------------------------------------------------------------

def rule_amount_matches_items(claim: dict) -> RuleResult:
    items = claim.get("items", [])

    if not items:
        return _pass("AMOUNT_MISMATCH", "warning")  # No items = caught elsewhere

    items_total = sum(
        float(i.get("unit_price", 0)) * max(1, int(i.get("quantity", 1)))
        for i in items
    )
    claimed = float(claim.get("claimed_amount", 0))

    if items_total == 0:
        return _pass("AMOUNT_MISMATCH", "warning")

    discrepancy_pct = abs(claimed - items_total) / items_total

    if discrepancy_pct > 0.05:
        return RuleResult(
            "AMOUNT_MISMATCH",
            False,
            "warning",
            "claimed_amount",
            (
                f"Claimed KES {claimed:,.0f} differs from item total "
                f"KES {items_total:,.0f} by {discrepancy_pct * 100:.1f}%"
            ),
            "Recalculate the total from your line items or correct the claimed amount.",
        )

    return _pass("AMOUNT_MISMATCH", "warning")


# ---------------------------------------------------------------------------
# Rule 6 — Patient coverage must not be expired on the visit date
# ---------------------------------------------------------------------------

def rule_coverage_active(claim: dict) -> RuleResult:
    end_raw = str(claim.get("coverage_end_date", "")).strip()
    visit_raw = str(claim.get("visit_date", "")).strip()

    if not end_raw or not visit_raw:
        return _pass("COVERAGE_EXPIRED")

    try:
        end_date = datetime.strptime(end_raw, "%Y-%m-%d").date()
        visit_date = datetime.strptime(visit_raw, "%Y-%m-%d").date()
    except ValueError:
        return _pass("COVERAGE_EXPIRED")  # Date format issues caught by other rules

    if visit_date > end_date:
        days_over = (visit_date - end_date).days
        return RuleResult(
            "COVERAGE_EXPIRED",
            False,
            "error",
            "coverage_end_date",
            f"Coverage expired {days_over} day(s) before the visit date (expired {end_raw})",
            "Confirm the patient renewed their SHA cover before the visit. Check the SHA portal.",
        )

    return _pass("COVERAGE_EXPIRED")


# ---------------------------------------------------------------------------
# Rule 7 — Claimed amount should not exceed SHA thresholds
#          Maternity claims (ICD-10 O*) have a higher threshold
# ---------------------------------------------------------------------------

def rule_amount_reasonable(claim: dict) -> RuleResult:
    claimed = float(claim.get("claimed_amount", 0))
    diagnosis = str(claim.get("diagnosis_code", "")).strip().upper()

    is_maternity = diagnosis.startswith("O")
    threshold = 150_000 if is_maternity else 50_000

    if claimed > threshold:
        return RuleResult(
            "AMOUNT_HIGH",
            False,
            "warning",
            "claimed_amount",
            f"Claimed KES {claimed:,.0f} exceeds the {('maternity' if is_maternity else 'standard')} threshold of KES {threshold:,.0f}",
            "Attach supporting documentation. SHA may flag this for manual review.",
        )

    return _pass("AMOUNT_HIGH", "warning")


# ---------------------------------------------------------------------------
# All rules in execution order.
# Errors first so the score reflects the most critical issues prominently.
# ---------------------------------------------------------------------------

ALL_RULES = [
    rule_required_fields,
    rule_icd10_format,
    rule_visit_date_valid,
    rule_items_valid,
    rule_coverage_active,
    rule_amount_matches_items,
    rule_amount_reasonable,
]
