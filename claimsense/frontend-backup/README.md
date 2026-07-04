# ClaimSense — Frontend

React + Vite + Tailwind dashboard for the SHA pre-submission claims validator
(openIMIS Hackathon, Track 3: Claims Management & Fraud Detection).

## Architecture

Two screens:

- **Landing (`LandingPage`)** — shown on first launch. Shows a live snapshot
  of the queue (average score via the same `ScoreGauge` used in the
  dashboard, counts by status) and the officer's 4-step workflow, then hands
  off to the dashboard. Doubles as an "empty state" when the queue is empty.
- **Dashboard** — the two-pane layout described below.

Two-pane dashboard layout:

- **Left sidebar** (`ClaimList`) — dark, scrollable queue of claims. Each row
  shows patient, facility, visit date, claim ID, and a color-coded pre-score
  dot so an officer can triage the queue before opening anything.
- **Right panel** (`ValidationPanel`) — the workspace for a selected claim:
  an SVG `ScoreGauge`, a `StatusBadge`, one `ErrorCard` per rule (with an
  AI-generated plain-English explanation and an inline correction field for
  fixable errors), a collapsible FHIR R4 `ClaimResponse` preview, and the
  validate → correct → submit action flow.

State is split by concern:

| Concern                      | Where it lives                     |
|-------------------------------|-------------------------------------|
| Claims list + refresh         | `hooks/useClaims.js`                |
| Selected claim ID             | `App.jsx` (only real "global" state)|
| Validate/correct/submit flow  | `hooks/useClaimValidation.js`       |
| Color/severity → style mapping| `constants/status.js`               |

Components stay presentational; hooks own data-fetching and state
transitions. This keeps `ValidationPanel.jsx` and `ClaimList.jsx` readable
and makes the workflow logic unit-testable independent of rendering.

### Add Claim

`AddClaimModal` collects a new claim (patient, visit, coverage, and one or
more service items) and submits it via `api.createClaim`. The form's field
set intentionally mirrors the 7 validation rules — it teaches the officer
what a complete claim looks like before they ever click Validate.

**Backend requirement:** this needs a `POST /claims` route that does not
exist in the original spec. Add this to `backend/main.py`:

```python
import uuid

@app.post("/claims")
async def create_claim(claim: dict):
    """Create a new claim and add it to the in-memory queue for this demo session."""
    new_id = claim.get("id") or f"SHA-CLM-{date.today().year}-{uuid.uuid4().hex[:6].upper()}"
    new_claim = {**claim, "id": new_id}
    MOCK_CLAIMS.append(new_claim)
    result = validate(new_claim)
    return {
        "claim": new_claim,
        "_preview": {
            "score": result["score"],
            "status": result["status"],
            "color": result["color"],
            "error_count": result["error_count"],
            "warning_count": result["warning_count"],
        },
    }
```

`date` is already imported in `validation/rules.py` but you'll need
`from datetime import date` at the top of `main.py` too if it isn't there
already.

## Setup

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`. It expects the FastAPI backend at
`http://localhost:8001` (override with `VITE_API_BASE_URL` in a `.env` file
— see `.env.example`).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build to `dist/`
- `npm run lint` — ESLint (React + hooks rules)

## Key limitations

- No client-side routing — single view, claim selection is local state only.
- No authentication — assumes the backend and openIMIS handle access control.
- The FHIR preview is read-only; edits happen through the rule-driven
  correction inputs, not by editing the FHIR JSON directly.
