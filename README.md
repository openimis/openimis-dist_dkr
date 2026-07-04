🩺 ClaimSense

🚀 The Problem & The Solution
Claim Rejection Is Only One Symptom of a Larger Challenge
It's tempting to treat claim rejection as the problem to solve. It isn't — it's the visible symptom of deeper, systemic weaknesses in how claims move through the health financing system. Hospital billing teams and SHA-accredited facilities are contending with:
Lengthy claims adjudication workflows — claims pass through multiple manual checkpoints before a decision is reached, each one adding latency
Manual verification processes — eligibility, coverage, and coding checks are still largely done by hand, at clerk-level throughput
Poor documentation quality — errors introduced at the point of entry become expensive to trace once a claim is deep in the pipeline
Lack of intelligent decision support for claims officers — staff work claim-by-claim with nothing flagging risk before submission
Reimbursement delays affecting hospital cash flow — every rejected or returned claim extends the revenue cycle for a facility already operating on thin margins
Weak provider feedback loops that prevent continuous improvement — facilities rarely get structured insight into why claims are rejected or delayed, so the same errors resurface month after month
High administrative workload — staff time is consumed re-working claims that could have been caught in seconds at the point of entry
Fix these upstream issues and the rejection rate takes care of itself. Chase the rejection rate alone, and the underlying workflow problems stay exactly where they were.
The ClaimSense Shift
ClaimSense operates as a pre-submission intelligence layer within the openIMIS workflow — not a replacement for openIMIS, and not a system that makes decisions on anyone's behalf. It plugs into the existing claims process at the point where a claims officer is preparing a claim, reviews it the moment it's drafted, and returns immediate, actionable feedback. The claims officer reviews, corrects, and decides — ClaimSense assists that judgment, it never substitutes for it.
Catch errors early — missing fields, bad codes, expired coverage, mismatched totals
Score every claim — a transparent 0–100 readiness score, no black box
Explain in plain English — Claude translates technical rule failures into instructions a claims clerk can act on
Zero disruption — works entirely against draft/mock data until a claim is ready, then hands off a proper FHIR payload to openIMIS

🛠️ Architecture & System Flow
ClaimSense is a rule-based engine, not a black-box classifier. Every score is traceable to a specific, named rule — auditable by design, and with no confusion matrix to defend to a room full of clinicians.
[ React Dashboard ]
        │
        ▼ (Select / edit a claim)
[ FastAPI Validation Engine ] ──► [ 7 Deterministic SHA Rules ]
        │                                   │
        │                                   ▼ (score + pass/fail per rule)
        │                         [ Claude API — Plain-English Explainer ]
        ▼                                   │
[ Score Gauge · Error Cards · Corrections ] ◄┘
        │
        ▼ (All errors resolved)
[ FHIR R4 ClaimResponse ] ──► [ openIMIS Core ]

The step-by-step flow
Draft / fetch — The dashboard loads a claim, either from mock data or a live openIMIS FHIR Claim bundle.

The name says what it does: sense-check a claim before it goes anywhere near SHA — catching what a tired clerk might miss at 4pm on a Friday.
By shifting claims handling from reactive to proactive, ClaimSense cuts rejection rates, reduces administrative backlog, and protects revenue for healthcare facilities.

🚀 The Problem & The Solution
Claim Rejection Is Only One Symptom of a Larger Challenge
It's tempting to treat claim rejection as the problem to solve. It isn't — it's the visible symptom of deeper, systemic weaknesses in how claims move through the health financing system. Hospital billing teams and SHA-accredited facilities are contending with:
Lengthy claims adjudication workflows — claims pass through multiple manual checkpoints before a decision is reached, each one adding latency
Manual verification processes — eligibility, coverage, and coding checks are still largely done by hand, at clerk-level throughput
Poor documentation quality — errors introduced at the point of entry become expensive to trace once a claim is deep in the pipeline
Lack of intelligent decision support for claims officers — staff work claim-by-claim with nothing flagging risk before submission
Reimbursement delays affecting hospital cash flow — every rejected or returned claim extends the revenue cycle for a facility already operating on thin margins
Weak provider feedback loops that prevent continuous improvement — facilities rarely get structured insight into why claims are rejected or delayed, so the same errors resurface month after month
High administrative workload — staff time is consumed re-working claims that could have been caught in seconds at the point of entry
Fix these upstream issues and the rejection rate takes care of itself. Chase the rejection rate alone, and the underlying workflow problems stay exactly where they were.
