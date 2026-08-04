"""
HTTP client for the openIMIS FHIR R4 API.
Handles auth, error logging, and parsing FHIR Bundles into our internal format.
"""

import logging
import httpx
from config import config

logger = logging.getLogger(__name__)


class OpenIMISClient:
    def __init__(self) -> None:
        self.base = config.OPENIMIS_URL.rstrip("/")
        self._headers = {
            "Accept": "application/fhir+json",
            "Content-Type": "application/fhir+json",
        }
        if config.OPENIMIS_TOKEN:
            self._headers["Authorization"] = f"Bearer {config.OPENIMIS_TOKEN}"

    async def get_claims(self, status: str = "entered") -> dict:
        url = f"{self.base}/api/claim/fhir/r4/Claim/?status={status}"
        logger.debug("GET %s", url)
        async with httpx.AsyncClient(
            headers=self._headers,
            verify=False,
            timeout=httpx.Timeout(15.0),
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()

    async def get_claims_parsed(self, status: str = "entered") -> list[dict]:
        """
        Fetch claims from openIMIS and convert each FHIR Claim resource
        into our internal claim dict format so the rest of the app
        (validation, scoring, frontend) works the same whether data
        comes from live openIMIS or the mock dataset.
        """
        bundle = await self.get_claims(status)
        entries = bundle.get("entry", [])
        logger.info("openIMIS returned %d claims in bundle", len(entries))
        return [_fhir_claim_to_internal(e["resource"]) for e in entries if "resource" in e]

    async def post_claim_response(self, payload: dict) -> dict:
        url = f"{self.base}/api/claim/fhir/r4/ClaimResponse/"
        logger.info("POST ClaimResponse: %s", payload.get("id"))
        async with httpx.AsyncClient(
            headers=self._headers,
            verify=False,
            timeout=httpx.Timeout(15.0),
        ) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            return response.json()

    async def get_coverage(self, patient_id: str) -> dict:
        url = f"{self.base}/api/claim/fhir/r4/Coverage/?beneficiary={patient_id}&status=active"
        async with httpx.AsyncClient(
            headers=self._headers,
            verify=False,
            timeout=httpx.Timeout(10.0),
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()


def _fhir_claim_to_internal(resource: dict) -> dict:
    """
    Convert a FHIR R4 Claim resource dict into the flat internal format
    our validation engine and frontend expect.

    FHIR Claim spec: https://hl7.org/fhir/R4/claim.html
    """
    # --- identifiers ---
    claim_id = resource.get("id", "")
    identifiers = resource.get("identifier", [])
    claim_code = identifiers[0].get("value", claim_id) if identifiers else claim_id

    # --- patient ---
    patient_ref = resource.get("patient", {}).get("reference", "")
    patient_id = patient_ref.split("/")[-1] if "/" in patient_ref else patient_ref
    patient_name = resource.get("patient", {}).get("display", "Unknown Patient")

    # --- facility / provider ---
    provider_ref = resource.get("provider", {}).get("reference", "")
    facility_code = provider_ref.split("/")[-1] if "/" in provider_ref else provider_ref
    facility_name = resource.get("provider", {}).get("display", "Unknown Facility")

    # --- dates ---
    # openIMIS puts visit date in billablePeriod.start
    period = resource.get("billablePeriod", {})
    visit_date = period.get("start", "")[:10] if period.get("start") else ""

    # --- diagnosis ---
    diagnoses = resource.get("diagnosis", [])
    diagnosis_code = ""
    diagnosis_description = ""
    if diagnoses:
        first = diagnoses[0]
        concept = first.get("diagnosisCodeableConcept", {})
        codings = concept.get("coding", [])
        if codings:
            diagnosis_code = codings[0].get("code", "")
            diagnosis_description = codings[0].get("display", "")

    # --- line items ---
    items = []
    for item in resource.get("item", []):
        product = item.get("productOrService", {})
        codings = product.get("coding", [])
        service_code = codings[0].get("code", "") if codings else ""
        description = codings[0].get("display", "") if codings else ""
        quantity = item.get("quantity", {}).get("value", 1)
        unit_price = item.get("unitPrice", {}).get("value", 0)
        items.append({
            "service_code": service_code,
            "description": description,
            "quantity": quantity,
            "unit_price": unit_price,
        })

    # --- total ---
    total = resource.get("total", {})
    claimed_amount = total.get("value", 0) if isinstance(total, dict) else 0

    return {
        "id": claim_code,
        "patient_id": patient_id,
        "patient_name": patient_name,
        "dob": "",
        "gender": "",
        "facility_code": facility_code,
        "facility_name": facility_name,
        "visit_date": visit_date,
        "diagnosis_code": diagnosis_code,
        "diagnosis_description": diagnosis_description,
        "coverage_start_date": "",
        "coverage_end_date": "",
        "items": items,
        "claimed_amount": claimed_amount,
        "scheme_code": "SHA-2025",
        "_source": "openimis",
    }


openimis = OpenIMISClient()
