"""
Generates plain-English error explanations using Google Gemini 3.5 Flash.
Uses google-genai SDK as per official docs: https://ai.google.dev/gemini-api/docs

Falls back to built-in rule suggestion text if:
  - GEMINI_API_KEY is not set in .env
  - The API call fails for any reason
  - The response cannot be parsed as JSON
"""

import json
import logging
from google import genai
from config import config

logger = logging.getLogger(__name__)

# Initialize once at import time
_client = genai.Client(api_key=config.GEMINI_API_KEY) if config.GEMINI_API_KEY else None


def explain_errors(errors: list[dict], claim: dict) -> dict[str, str]:
    """
    Returns a dict mapping rule_id to plain-English explanation.
    Falls back to built-in suggestion text if Gemini is unavailable.
    """
    if not errors:
        return {}

    if not _client:
        logger.info("Gemini disabled — GEMINI_API_KEY not set, using fallback")
        return {e["rule_id"]: e["suggestion"] for e in errors}

    error_lines = "\n".join(
        f'rule_id="{e["rule_id"]}" | issue="{e["message"]}" | hint="{e["suggestion"]}"'
        for e in errors
    )

    context = (
        f"Claim ID: {claim.get('id', 'unknown')}\n"
        f"Patient: {claim.get('patient_name', 'Unknown')}\n"
        f"Facility: {claim.get('facility_name', 'Unknown')}\n"
        f"Diagnosis: {claim.get('diagnosis_code', '')} — "
        f"{claim.get('diagnosis_description', '')}\n"
    )

    prompt = f"""You are ClaimSense, helping hospital claims officers at SHA Kenya fix insurance claims.

Explain each validation failure below in simple, direct language a non-technical hospital clerk can act on.
No jargon. No FHIR, ICD-10 subcode, adjudication. Write as if speaking to someone at a hospital reception desk.

Claim context:
{context}

Errors to explain:
{error_lines}

Respond ONLY with a valid JSON object. One key per rule_id, value is 2-3 sentences explaining
what went wrong, why SHA cares, and what to do.

Example:
{{
  "MISSING_FIELDS": "The patient ID is missing. SHA cannot process a claim without knowing who was treated. Ask the patient for their SHA membership card and enter the number shown on it."
}}"""

    try:
        response = _client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )

        raw = response.text.strip()

        # Strip markdown fences if present
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1].lstrip("json").strip() if len(parts) >= 2 else raw

        parsed = json.loads(raw)

        # Fill any missing keys with fallback
        for e in errors:
            if e["rule_id"] not in parsed:
                parsed[e["rule_id"]] = e["suggestion"]

        return parsed

    except json.JSONDecodeError as exc:
        logger.warning("Gemini response not valid JSON (%s) — using fallback", exc)
        return {e["rule_id"]: e["suggestion"] for e in errors}

    except Exception as exc:
        logger.error("Gemini API call failed: %s", exc)
        return {e["rule_id"]: e["suggestion"] for e in errors}
