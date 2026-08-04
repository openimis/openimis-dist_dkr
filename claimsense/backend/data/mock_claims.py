# Five realistic SHA Kenya claims covering different error scenarios.
# These are used when OPENIMIS_TOKEN is not set in .env.
#
# CLM-001: clean claim — passes all rules  (demo "good" state)
# CLM-002: broken claim — fails 4 rules    (demo "bad" state → fix live on stage)
# CLM-003: maternity claim — passes        (shows coverage of different claim types)
# CLM-004: warning only — amount mismatch  (shows warnings vs errors distinction)
# CLM-005: missing patient ID + item codes (another error demo)

from datetime import date, timedelta

_today = date.today()
_yesterday = str(_today - timedelta(days=1))
_three_days_ago = str(_today - timedelta(days=3))
_seven_days_ago = str(_today - timedelta(days=7))
_future = str(_today + timedelta(days=5))


MOCK_CLAIMS: list[dict] = [
    {
        "id": "SHA-CLM-2026-001",
        "patient_id": "INS-KE-44218",
        "patient_name": "Grace Wanjiru Njoroge",
        "dob": "1989-03-14",
        "gender": "F",
        "facility_code": "KNH-001",
        "facility_name": "Kenyatta National Hospital",
        "visit_date": _three_days_ago,
        "diagnosis_code": "J18.9",
        "diagnosis_description": "Pneumonia, unspecified organism",
        "coverage_start_date": "2025-01-01",
        "coverage_end_date": "2027-01-01",
        "items": [
            {
                "service_code": "SHA-CONS-001",
                "description": "GP Consultation",
                "quantity": 1,
                "unit_price": 1500,
            },
            {
                "service_code": "SHA-LAB-014",
                "description": "Chest X-Ray (PA view)",
                "quantity": 1,
                "unit_price": 3200,
            },
            {
                "service_code": "SHA-MED-201",
                "description": "Amoxicillin 500mg x21 tablets",
                "quantity": 1,
                "unit_price": 850,
            },
            {
                "service_code": "SHA-LAB-003",
                "description": "Full Blood Count",
                "quantity": 1,
                "unit_price": 1200,
            },
        ],
        "claimed_amount": 6750,
        "scheme_code": "SHA-2025",
    },
    {
        "id": "SHA-CLM-2026-002",
        "patient_id": "INS-KE-88321",
        "patient_name": "Joseph Mwangi Kamau",
        "dob": "1975-08-22",
        "gender": "M",
        "facility_code": "MKT-003",
        "facility_name": "Mbagathi County Hospital",
        # Error: visit is in the future
        "visit_date": _future,
        # Error: invalid ICD-10 format
        "diagnosis_code": "ZZZ999",
        "diagnosis_description": "Unknown condition",
        "coverage_start_date": "2024-01-01",
        # Error: coverage expired before visit
        "coverage_end_date": "2026-06-30",
        # Error: no items
        "items": [],
        "claimed_amount": 0,
        "scheme_code": "SHA-2025",
    },
    {
        "id": "SHA-CLM-2026-003",
        "patient_id": "INS-KE-22015",
        "patient_name": "Amina Hassan Osman",
        "dob": "1995-11-30",
        "gender": "F",
        "facility_code": "PGH-002",
        "facility_name": "Pumwani Maternity Hospital",
        "visit_date": _yesterday,
        "diagnosis_code": "O80",
        "diagnosis_description": "Single spontaneous delivery",
        "coverage_start_date": "2025-06-01",
        "coverage_end_date": "2027-06-01",
        "items": [
            {
                "service_code": "SHA-MAT-001",
                "description": "Normal delivery",
                "quantity": 1,
                "unit_price": 12000,
            },
            {
                "service_code": "SHA-MAT-005",
                "description": "Newborn care day 1",
                "quantity": 1,
                "unit_price": 3500,
            },
            {
                "service_code": "SHA-MED-001",
                "description": "IV Normal Saline 0.9% 1L",
                "quantity": 2,
                "unit_price": 450,
            },
        ],
        "claimed_amount": 16400,
        "scheme_code": "SHA-2025",
    },
    {
        "id": "SHA-CLM-2026-004",
        "patient_id": "INS-KE-61104",
        "patient_name": "Peter Otieno Odhiambo",
        "dob": "1962-04-05",
        "gender": "M",
        "facility_code": "AGH-001",
        "facility_name": "Aga Khan Hospital Nairobi",
        "visit_date": _seven_days_ago,
        "diagnosis_code": "E11.9",
        "diagnosis_description": "Type 2 diabetes mellitus without complications",
        "coverage_start_date": "2024-07-01",
        "coverage_end_date": "2027-07-01",
        "items": [
            {
                "service_code": "SHA-CONS-002",
                "description": "Specialist consultation",
                "quantity": 1,
                "unit_price": 3500,
            },
            {
                "service_code": "SHA-LAB-021",
                "description": "HbA1c test",
                "quantity": 1,
                "unit_price": 2800,
            },
            {
                "service_code": "SHA-MED-301",
                "description": "Metformin 500mg x60 tabs",
                "quantity": 1,
                "unit_price": 1200,
            },
        ],
        # Warning: claimed_amount is 9000 but items total 7500 — 20% mismatch
        "claimed_amount": 9000,
        "scheme_code": "SHA-2025",
    },
    {
        "id": "SHA-CLM-2026-005",
        "patient_id": "",  # Error: missing patient ID
        "patient_name": "Unknown Patient",
        "dob": "",
        "gender": "F",
        "facility_code": "NRB-CHC-012",
        "facility_name": "Nairobi Community Health Centre",
        "visit_date": _yesterday,
        "diagnosis_code": "K59.0",
        "diagnosis_description": "Constipation",
        "coverage_start_date": "",
        "coverage_end_date": "2027-01-01",
        "items": [
            {
                # Error: item has no service code
                "service_code": "",
                "description": "Consultation fee",
                "quantity": 1,
                "unit_price": 500,
            }
        ],
        "claimed_amount": 500,
        "scheme_code": "SHA-2025",
    },
]
