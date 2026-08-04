"""
Builds a valid FHIR R4 ClaimResponse resource from our internal validation output.

ClaimResponse spec: https://hl7.org/fhir/R4/claimresponse.html

This resource is what openIMIS expects when we POST adjudication results.
Every validation rule maps to one adjudication entry.
"""

from datetime import datetime, timezone


def build_claim_response(claim: dict, validation: dict) -> dict:
    """
    Map internal validation output → FHIR R4 ClaimResponse.

    FHIR outcome values:
      complete → processing done, no errors
      error    → processing done, errors found
    """
    outcome = "complete" if validation["passed"] else "error"
    created = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # One adjudication entry per rule result
    adjudication = [
        _make_adjudication_entry(rule_result)
        for rule_result in validation["results"]
    ]

    # Items array — one entry referencing all adjudications
    items = [{"itemSequence": 1, "adjudication": adjudication}]

    # Total approved amount: full claim if passed, 0 if errors exist
    approved_amount = (
        float(claim.get("claimed_amount", 0))
        if validation["passed"]
        else 0.0
    )

    return {
        "resourceType": "ClaimResponse",
        "id": f"CR-{claim.get('id', 'unknown')}",
        "status": "active",
        "type": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/claim-type",
                    "code": "professional",
                    "display": "Professional",
                }
            ]
        },
        "use": "claim",
        "patient": {
            "reference": f"Patient/{claim.get('patient_id', 'unknown')}"
        },
        "created": created,
        "insurer": {
            "display": "Social Health Authority Kenya"
        },
        "request": {
            "reference": f"Claim/{claim.get('id', 'unknown')}"
        },
        "outcome": outcome,
        "disposition": validation["status"],
        "item": items,
        "total": [
            {
                "category": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/adjudication",
                            "code": "benefit",
                            "display": "Benefit Amount",
                        }
                    ]
                },
                "amount": {
                    "value": approved_amount,
                    "currency": "KES",
                },
            }
        ],
        # Custom extensions for ClaimSense-specific data
        "extension": [
            {
                "url": "https://claimsense.ke/fhir/StructureDefinition/validation-score",
                "valueDecimal": validation["score"],
            },
            {
                "url": "https://claimsense.ke/fhir/StructureDefinition/error-count",
                "valueInteger": validation["error_count"],
            },
            {
                "url": "https://claimsense.ke/fhir/StructureDefinition/warning-count",
                "valueInteger": validation["warning_count"],
            },
        ],
    }


def _make_adjudication_entry(rule_result: dict) -> dict:
    """
    Build one FHIR adjudication block from a rule result.
    Passed rules get value=1, failed rules get value=0 and a reason code.
    """
    entry: dict = {
        "category": {
            "coding": [
                {
                    "system": "https://claimsense.ke/fhir/CodeSystem/validation-rules",
                    "code": rule_result["rule_id"],
                    "display": rule_result["rule_id"].replace("_", " ").title(),
                }
            ]
        },
        "value": 1 if rule_result["passed"] else 0,
    }

    if not rule_result["passed"]:
        entry["reason"] = {
            "coding": [
                {
                    "system": "https://claimsense.ke/fhir/CodeSystem/validation-errors",
                    "code": rule_result["rule_id"],
                    "display": rule_result["message"],
                }
            ]
        }

    return entry
