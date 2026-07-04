"""
Unit tests for the validation rules engine.
Run with: pytest tests/ -v
These must pass before the demo — judges check for test coverage.
"""

from datetime import date, timedelta
import pytest

from validation.rules import (
    rule_required_fields,
    rule_icd10_format,
    rule_visit_date_valid,
    rule_items_valid,
    rule_amount_matches_items,
    rule_coverage_active,
)
from validation.engine import validate


def _base_claim(**overrides) -> dict:
    """Return a valid claim, optionally overriding specific fields."""
    today = str(date.today() - timedelta(days=1))
    claim = {
        "id": "TEST-001",
        "patient_id": "INS-TEST-001",
        "facility_code": "FAC-001",
        "facility_name": "Test Hospital",
        "visit_date": today,
        "diagnosis_code": "J18.9",
        "diagnosis_description": "Pneumonia",
        "coverage_start_date": "2024-01-01",
        "coverage_end_date": "2027-01-01",
        "items": [
            {"service_code": "SHA-CONS-001", "description": "Consultation", "quantity": 1, "unit_price": 1500}
        ],
        "claimed_amount": 1500,
    }
    claim.update(overrides)
    return claim


class TestRequiredFields:
    def test_passes_when_all_fields_present(self):
        result = rule_required_fields(_base_claim())
        assert result.passed

    def test_fails_when_patient_id_missing(self):
        result = rule_required_fields(_base_claim(patient_id=""))
        assert not result.passed
        assert result.severity == "error"
        assert "Patient" in result.message

    def test_fails_when_multiple_fields_missing(self):
        result = rule_required_fields(_base_claim(patient_id="", facility_code=""))
        assert not result.passed


class TestICD10Format:
    @pytest.mark.parametrize("code", ["J18.9", "O80", "E11.9", "A00", "Z99.89"])
    def test_valid_codes(self, code):
        result = rule_icd10_format(_base_claim(diagnosis_code=code))
        assert result.passed

    @pytest.mark.parametrize("code", ["ZZZ999", "J1.9", "1AB", "INVALID", "j18.9"])
    def test_invalid_codes(self, code):
        result = rule_icd10_format(_base_claim(diagnosis_code=code))
        assert not result.passed
        assert result.field == "diagnosis_code"


class TestVisitDate:
    def test_valid_past_date(self):
        yesterday = str(date.today() - timedelta(days=1))
        result = rule_visit_date_valid(_base_claim(visit_date=yesterday))
        assert result.passed

    def test_fails_for_future_date(self):
        tomorrow = str(date.today() + timedelta(days=1))
        result = rule_visit_date_valid(_base_claim(visit_date=tomorrow))
        assert not result.passed
        assert "future" in result.message.lower()

    def test_fails_for_wrong_format(self):
        result = rule_visit_date_valid(_base_claim(visit_date="03/07/2026"))
        assert not result.passed


class TestItems:
    def test_passes_with_valid_items(self):
        result = rule_items_valid(_base_claim())
        assert result.passed

    def test_fails_with_no_items(self):
        result = rule_items_valid(_base_claim(items=[]))
        assert not result.passed
        assert result.severity == "error"

    def test_fails_when_item_missing_service_code(self):
        items = [{"service_code": "", "description": "Consult", "quantity": 1, "unit_price": 500}]
        result = rule_items_valid(_base_claim(items=items))
        assert not result.passed


class TestCoverageActive:
    def test_passes_when_coverage_valid(self):
        result = rule_coverage_active(_base_claim())
        assert result.passed

    def test_fails_when_coverage_expired(self):
        yesterday = str(date.today() - timedelta(days=1))
        two_days_ago = str(date.today() - timedelta(days=2))
        result = rule_coverage_active(_base_claim(
            coverage_end_date=two_days_ago,
            visit_date=yesterday,
        ))
        assert not result.passed
        assert result.severity == "error"


class TestEngine:
    def test_perfect_claim_scores_100(self):
        result = validate(_base_claim())
        assert result["score"] == 100
        assert result["passed"] is True
        assert result["error_count"] == 0

    def test_broken_claim_scores_low(self):
        broken = _base_claim(
            patient_id="",
            diagnosis_code="INVALID",
            items=[],
        )
        result = validate(broken)
        assert result["score"] < 60
        assert result["error_count"] >= 2

    def test_score_never_goes_below_zero(self):
        # Even a completely broken claim stays at 0 minimum
        broken = _base_claim(
            patient_id="",
            facility_code="",
            diagnosis_code="BADCODE",
            items=[],
            visit_date=str(date.today() + timedelta(days=10)),
            coverage_end_date="2020-01-01",
            claimed_amount=999999,
        )
        result = validate(broken)
        assert result["score"] >= 0
