# 🩺 ClaimSense

**"Grammarly for hospital claims."**

ClaimSense is an AI-assisted, pre-submission validation module built for openIMIS. It intercepts SHA (Social Health Authority) claim data at the draft stage — flagging errors, checking eligibility rules, and scoring a claim's readiness — *before* it's ever formally submitted.

> The name says what it does: *sense-check* a claim before it goes anywhere near SHA — catching what a tired clerk might miss at 4pm on a Friday.

By shifting claims handling from **reactive to proactive**, ClaimSense cuts rejection rates, reduces administrative backlog, and protects revenue for healthcare facilities.

---

## 🚀 The Problem & The Solution

### Claim Rejection Is Only One Symptom of a Larger Challenge

It's tempting to treat claim rejection as the problem to solve. It isn't — it's the visible symptom of deeper, systemic weaknesses in how claims move through the health financing system. Hospital billing teams and SHA-accredited facilities are contending with:

- **Lengthy claims adjudication workflows** — claims pass through multiple manual checkpoints before a decision is reached, each one adding latency
- **Manual verification processes** — eligibility, coverage, and coding checks are still largely done by hand, at clerk-level throughput
- **Poor documentation quality** — errors introduced at the point of entry become expensive to trace once a claim is deep in the pipeline
- **Lack of intelligent decision support for claims officers** — staff work claim-by-claim with nothing flagging risk before submission
- **Reimbursement delays affecting hospital cash flow** — every rejected or returned claim extends the revenue cycle for a facility already operating on thin margins
- **Weak provider feedback loops that prevent continuous improvement** — facilities rarely get structured insight into *why* claims are rejected or delayed, so the same errors resurface month after month
- **High administrative workload** — staff time is consumed re-working claims that could have been caught in seconds at the point of entry

Fix these upstream issues and the rejection rate takes care of itself. Chase the rejection rate alone, and the underlying workflow problems stay exactly where they were.

### The ClaimSense Shift

ClaimSense operates as a **pre-submission intelligence layer within the openIMIS workflow** — not a replacement for openIMIS, and not a system that makes decisions on anyone's behalf. It plugs into the existing claims process at the point where a claims officer is preparing a claim, reviews it the moment it's drafted, and returns immediate, actionable feedback. The claims officer reviews, corrects, and decides — ClaimSense assists that judgment, it never substitutes for it.

- **Catch errors early** — missing fields, bad codes, expired coverage, mismatched totals
- **Score every claim** — a transparent 0–100 readiness score, no black box
- **Explain in plain English** — Claude translates technical rule failures into instructions a claims clerk can act on
- **Zero disruption** — works entirely against draft/mock data until a claim is ready, then hands off a proper FHIR payload to openIMIS

---

## 🛠️ Architecture & System Flow

ClaimSense is a **rule-based engine**, not a black-box classifier. Every score is traceable to a specific, named rule — auditable by design, and with no confusion matrix to defend to a room full of clinicians.

```
[ React Dashboard ]
        │
        ▼ (Select / edit a claim)
[ FastAPI Validation Engine ] ──► [ 7 Deterministic SHA Rules ]
        │                                   │
        │                                   ▼ (score + pass/fail per rule)
        │                         [ Gemini API — Plain-English Explainer ]
        ▼                                   │
[ Score Gauge · Error Cards · Corrections ] ◄┘
        │
        ▼ (All errors resolved)
[ FHIR R4 ClaimResponse ] ──► [ openIMIS Core ]
```

### The step-by-step flow

1. **Draft / fetch** — The dashboard loads a claim, either from mock data or a live openIMIS FHIR `Claim` bundle.
2. **Rule pass** — Seven deterministic rules run against the claim: required fields, ICD-10 format, visit date sanity, item/service codes, coverage window, amount-vs-items match, and amount-reasonableness thresholds.
3. **Score** — Each failed rule deducts points (errors −20, warnings −10) off a base of 100, producing a color-coded status: 🟢 Ready · 🟡 Needs Review · 🔴 High Risk.
4. **Explain** — Every error is batched into a single Gemini API call that returns a short, non-technical explanation and fix suggestion per rule.
5. **Correct & re-validate** — The clerk edits flagged fields inline; the claim is re-scored instantly, no resubmission needed.
6. **Submit** — Once all *errors* (not warnings) clear, a FHIR R4 `ClaimResponse` is built and POSTed to openIMIS — or held in mock mode until credentials are live.

---

## 📁 Project Structure

```
claimsense/
├── .env
├── .gitignore
├── backend/
│   ├── main.py                   ← FastAPI app, all routes
│   ├── config.py                 ← env var loader (mock vs. live mode)
│   ├── requirements.txt
│   ├── data/
│   │   └── mock_claims.py        ← 5 realistic SHA claims
│   ├── validation/
│   │   ├── rules.py               ← 7 rule functions
│   │   └── engine.py              ← runs rules, computes score
│   ├── fhir/
│   │   ├── client.py              ← openIMIS FHIR HTTP client
│   │   └── builder.py             ← builds ClaimResponse resource
│   ├── llm/
│   │   └── explainer.py           ← Gemini plain-English explanations
│   └── tests/
│       └── test_validation.py
└── frontend/
    ├── package.json
    └── src/
        ├── App.jsx
        ├── api/client.js
        └── components/
            ├── ClaimList.jsx
            ├── ValidationPanel.jsx
            ├── ScoreGauge.jsx
            ├── ErrorCard.jsx
            └── StatusBadge.jsx
```

---

## ⚡ Getting Started

### Prerequisites

- Python 3.10+
- Node.js v18+
- An Gemini API key (for plain-English explanations — optional, falls back gracefully)
- Access to a local openIMIS Docker stack (optional — the app runs entirely on mock data without it)

### Installation & Local Setup

**1. Clone and enter the project**

```bash
git clone https://github.com/Linnnetteseven/openimis-dist_dkr.git
cd openimis-dist_dkr/claimsense
```

**2. Configure environment variables**

Create a `.env` file at the project root:

```env
OPENIMIS_URL=https://localhost
OPENIMIS_TOKEN=            # leave blank to run on mock data
GEMINI_API_KEY=your_key_here
DEBUG=true
```

**3. Set up the backend**

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
pytest tests/ -v              # 24 tests should pass
uvicorn main:app --reload --port 8001
```

**4. Set up the frontend**

```bash
cd frontend
npm install
npm run dev
```

**5. Verify the services**

| Service | URL |
|---|---|
| Validation API | `http://localhost:8001` |
| Dashboard UI | `http://localhost:5173` |

```bash
curl http://localhost:8001/
# {"service": "ClaimSense", "status": "running", "mode": "mock", ...}
```

---

## 🧠 The Validation Engine

ClaimSense scores claims using **seven transparent, deterministic rules** — no training data, no drift, no model to retrain when SHA policy changes. Just code you can read in five minutes.

| Rule | Checks | Severity |
|---|---|---|
| Required Fields | Patient ID, facility code, visit date, diagnosis code present | 🔴 Error |
| ICD-10 Format | Diagnosis code matches valid ICD-10 structure | 🔴 Error |
| Visit Date | Not malformed, not in the future | 🔴 Error |
| Items Present | At least one item with a valid service code and quantity | 🔴 Error |
| Coverage Active | Patient's SHA coverage hadn't expired on the visit date | 🔴 Error |
| Amount Match | Claimed total within 5% of the line-item sum | 🟡 Warning |
| Amount Reasonable | Claimed total under facility/maternity thresholds | 🟡 Warning |

Scores translate into three tiers:

- 🟢 **85–100 — Ready for Submission**
- 🟡 **60–84 — Needs Review**
- 🔴 **0–59 — High Risk, Errors Found**

---

## 🎯 Hackathon Track Focus

ClaimSense was built for the **openIMIS Hackathon — Track 3 (Claims Management)**. By optimizing point-of-entry accuracy instead of chasing rejections after the fact, it targets the evaluation criteria around interoperability (FHIR R4), administrative cost reduction, and system reliability — with a validation core simple enough to demo, test, and trust on stage.

---

## 🗺️ Roadmap

- [ ] Full FHIR `Bundle` parser for live openIMIS claim ingestion
- [ ] Facility-level analytics on common rejection causes
- [ ] Coverage lookups via the openIMIS `Coverage` FHIR endpoint
- [ ] Responsible AI section documenting Gemini's role (explanation only — never adjudication)
