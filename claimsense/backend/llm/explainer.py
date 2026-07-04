"""
Generates plain-English error explanations using Claude.

One API call per claim validation — we batch all errors into a single prompt
instead of calling the API once per error. Keeps latency low and cost minimal.

Falls back to the rule's built-in suggestion text if:
  - ANTHROPIC_API_KEY is not set
  - The API call fails for any reason
  - The response cannot be parsed as JSON
"""

import json
import logging
from anthropic import Anthropic, APIError
from config import config

logger = logging.getLogger(__name__)

_client = Anthropic(api_key=config.ANTHROPIC_API_KEY) if config.ANTHROPIC_API_KEY else None

_SYSTEM = """You are ClaimSense, an assistant helping hospital claims officers at SHA Kenya
submit insurance claims without errors.

You receive a list of validation failures for one claim. Your job is to explain
each failure in simple, direct language that a non-technical claims clerk can act on.

Respond ONLY with a valid JSON object — no markdown, no extra text.
The object must have one key per rule_id in the errors list.
Each value is a 2-3 sentence string: what went wrong, why SHA cares, what to do.
Do not use technical terms like "FHIR", "ICD-10 subcode", or "adjudication"."""


def explain_errors(errors: list[dict], claim: dict) -> dict[str, str]:
    """
    Returns a dict mapping rule_id → plain-English explanation.
    Empty dict if there are no errors or the API key is not configured.
    """
    if not errors:
        return {}

    if not _client:
        logger.info("LLM disabled — returning built-in suggestions")
        return {e["rule_id"]: e["suggestion"] for e in errors}

    error_block = "\n".join(
        f'rule_id="{e["rule_id"]}" | issue="{e["message"]}" | hint="{e["suggestion"]}"'
        for e in errors
    )

    context = (
        f"Claim ID: {claim.get('id', 'unknown')}\n"
        f"Patient: {claim.get('patient_name', 'Unknown')}\n"
        f"Facility: {claim.get('facility_name', 'Unknown')}\n"
        f"Diagnosis: {claim.get('diagnosis_code', '')} — {claim.get('diagnosis_description', '')}\n"
    )

    prompt = (
        f"This claim has {len(errors)} validation issue(s).\n\n"
        f"Claim context:\n{context}\n"
        f"Errors:\n{error_block}\n\n"
        "Return a JSON object with one key per rule_id and a plain-English explanation as the value."
    )

    try:
        response = _client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=900,
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.content[0].text.strip()

        # Strip markdown code fences if Claude adds them despite instructions
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1].lstrip("json").strip() if len(parts) >= 2 else raw

        return json.loads(raw)

    except (APIError, json.JSONDecodeError) as exc:
        logger.warning("LLM explanation failed (%s) — using fallback text", exc)
        return {e["rule_id"]: e["suggestion"] for e in errors}

    except Exception as exc:
        logger.error("Unexpected LLM error: %s", exc)
        return {e["rule_id"]: e["suggestion"] for e in errors}
