# AfyaCapital - Claims Factoring for Healthcare Providers

**Project Name:** AfyaCapital  
**Hackathon:** openIMIS Hackathon 2026  
**Commit Tag:** `v1.0-hackathon`

> **Note:** This README serves as the master documentation for the AfyaCapital project and is duplicated across our three core repositories.
> 
> 🔗 **Project Repositories:**
> * [Distribution / Docker Config](https://github.com/Eny-Fabz/openimis-dist_dkr)
> * [Backend (Python/Django)](https://github.com/Eny-Fabz/openimis-be_py)
> * [Frontend (React/JS)](https://github.com/Eny-Fabz/openimis-fe_js)

---

## 📋 Table of Contents

- [The Problem: The Cash Flow Trap](#the-problem-the-cash-flow-trap)
- [The Proposed Solution](#the-proposed-solution)
- [Expected Impact & UHC Alignment](#expected-impact--uhc-alignment)
- [Minimum Viable Product (MVP)](#minimum-viable-product-mvp)
- [Conceptual Diagram](#conceptual-diagram)
- [Architecture & Technology Stack](#architecture--technology-stack)
- [System Integrations](#system-integrations)
- [Installation Guide](#installation-guide)
- [API Endpoints](#api-endpoints)
- [Known Limitations](#known-limitations)
- [Glossary of Terms](#glossary-of-terms)
- [Contributing & PR Instructions](#contributing--pr-instructions)
- [License](#license)

---

## 🚨 The Problem: The Cash Flow Trap

Healthcare facilities—especially smaller, rural clinics—often treat patients who are covered by the government’s Social Health Authority (SHA). However, the government takes a long time (sometimes 90 days or more) to actually pay the clinic for those treatments. 

Because the clinic's money is tied up waiting for the government to pay, the clinic runs out of daily cash (working capital). When they run out of cash, they cannot buy new medicines, pay their nurses, or maintain equipment. Ultimately, patients suffer because the clinic is out of supplies.

### Users & Stakeholders

* **Healthcare Facilities (The User):** Clinics and hospitals that need cash today to buy medicine and pay staff.
* **Financiers (The Lenders):** Banks or impact funds that want to safely lend money and earn a small fee.
* **Social Health Authority (The Payer):** The government body that eventually pays the medical bills.

---

## 💡 The Proposed Solution

**AfyaCapital** is a "Claims Factoring" platform. It acts as a bridge between the clinic, the government, and the bank. 

When a clinic submits a valid medical bill (a claim) to the government, AfyaCapital securely checks the status of that bill. If the bill is valid and pre-approved, AfyaCapital immediately gives the clinic a cash advance (e.g., 70% of the bill) so they can keep running. When the government finally pays the bill months later, the system automatically repays the advance and sends the remaining balance to the clinic.

---

## 🌍 Expected Impact & UHC Alignment

Universal Health Coverage (UHC) promises that everyone can get medical care without going broke. However, UHC fails if clinics close down or run out of drugs because they are waiting on government checks. 

**AfyaCapital keeps clinics financially healthy so they can keep their doors open, keeping the promise of UHC alive for the patients who rely on them.**

---

## 🎯 Minimum Viable Product (MVP)

For a 48-hour hackathon, we are not building a real banking ledger. The MVP is a **Claims Factoring Dashboard** for a clinic manager:

1. **Step 1:** The manager logs in and sees a list of their "Pending Claims" pulled via FHIR.
2. **Step 2:** The dashboard displays a **Risk Score** and an **Available Cash Advance** amount, calculated strictly from claims that openIMIS marks as pre-approved.
3. **Step 3:** The manager clicks a "Request Advance" button, and the system simulates a successful payout to their mobile money account.

---

## ⚙️ Architecture & Technology Stack

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend** | Python 3.11 / Django | API and business logic |
| **Frontend** | ReactJS | Dashboard UI |
| **Database** | PostgreSQL | Data persistence |
| **Containerization** | Docker / Docker Compose | Deployment and environment |
| **API Standard** | GraphQL | Flexible data querying |
| **Interoperability** | FHIR R4 | Healthcare data exchange |
| **Authentication** | JWT (JSON Web Tokens) | Secure API access |
| **OpenIMIS Version** | 25.10 | Core health insurance engine |
| **OpenSearch** | 2.9.0 | Search and analytics |

### Architecture Overview

---

## 🔗 System Integrations

### openIMIS Integration & Alignment
openIMIS is the software engine that manages these government health insurance claims. AfyaCapital integrates with openIMIS to reduce the risk of lending. Instead of guessing if a claim will be paid, AfyaCapital queries the openIMIS GraphQL API to see if a claim has been marked as "Checked" (meaning it passed fraud and rule checks). By relying on openIMIS's built-in validation, we ensure we only advance money on safe, guaranteed claims.

### FHIR Integration & Alignment
FHIR is the universal digital language for healthcare data. AfyaCapital uses FHIR APIs to "talk" to the clinic's software and openIMIS. 
* **FHIR Claim Resource:** Read to know how much money is owed.
* **FHIR ClaimResponse Resource:** Read from openIMIS to verify that the claim is approved.

---

## 🛠 Installation Guide

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Git | 2.35+ |
| Docker Desktop | WSL 2 enabled, 8 GB RAM |
| Node.js | 18+ |
| Python | 3.10+ |
| npm | 9+ |

### Step 1: Clone from the Team Lead's Fork

```bash
mkdir ~/afyacapital
cd ~/afyacapital

git clone https://github.com/YOUR_GITHUB_HANDLE/openimis-dist_dkr.git
git clone https://github.com/YOUR_GITHUB_HANDLE/openimis-be_py.git
git clone https://github.com/YOUR_GITHUB_HANDLE/openimis-fe_js.git
```

### Step 2: Configure Environment Variables

```bash
cd openimis-dist_dkr
cp .env.sample .env
```

Add the following to `.env` (Generate a strong SECRET_KEY first):

```bash
SECRET_KEY=your-strong-secret-key
MODE=Dev
DB_USER=IMISuser
DB_PASSWORD=IMISuserP@s
DB_NAME=IMIS
DB_HOST=db
DB_PORT=5432
DB_DEFAULT=postgresql
```

### Step 3: Configure Docker Compose

Open `docker-compose.yml` and add these settings under `x-api`:

```yaml
x-api: &default-api
  environment:
    - JWT_COOKIE_SECURE=False
    - MODE=Dev
    - SECRET_KEY=${SECRET_KEY}
    - AXES_ENABLED=False
```

### Step 4: Start the Docker Stack & Run Migrations

```bash
docker-compose up -d
# Wait 5-10 minutes for images to build/download
docker-compose run --rm migrations
```

### Step 5: Restore & Create Admin User

**1. Fix Admin Validity:**
```bash
docker exec -it afyacapital-db-1 psql -U IMISuser -d IMIS
```
Inside the shell, run:
```sql
UPDATE public."tblUsers" SET "ValidityTo" = NULL WHERE "UserID" = 1;
\q
```

**2. Create Technical User:**
```bash
docker exec -it afyacapital-backend-1 python manage.py shell
```
Inside the shell, run:
```python
from core.models import TechnicalUser
from django.contrib.auth.hashers import make_password
TechnicalUser.objects.create(username='Admin', password=make_password('Admin@1234'))
exit()
```

### Step 6: Access the UI
Open your browser to `http://localhost`.
Log in with: **Admin** / **Admin@1234**

---

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `http://localhost:8000/api/graphql` | GraphQL API endpoint (primary) |
| `http://localhost:8000/api/admin` | Django admin panel |
| `http://localhost:8000/api/core/` | Core API endpoints |

**Example GraphQL Query (Get Claims):**
```graphql
query {
  claims {
    edges {
      node {
        id
        status
        total
        patient {
          name
        }
      }
    }
  }
}
```

---

## ⚠️ Known Limitations

1. **Frontend Authentication:** The openIMIS frontend uses `InteractiveUser` (legacy `tblUsers`), while the GraphQL API uses `TechnicalUser`. Use `TechnicalUser` for API access.
2. **Admin User Creation:** The `createsuperuser` command in v25.10 does not prompt for a password. Users must be created manually via Django shell.
3. **Nginx Proxy Errors:** If you experience 502 errors when proxying to the backend, access the API directly via `http://localhost:8000/api/graphql`.
4. **AXES Lockout:** If you receive "Too many failed attempts," run: `docker exec -it afyacapital-backend-1 python manage.py axes_reset`
5. **JWT Cookie Secure Flag:** Ensure `MODE=Dev` is set locally so the `Secure` flag on JWT cookies is disabled over HTTP.

---

## 📚 Glossary of Terms 

* **Universal Health Coverage (UHC)**
  * *What it is:* A global goal ensuring all people have access to health services without facing financial ruin.
  * *AfyaCapital Example:* By keeping clinics financially stable, AfyaCapital ensures the clinic stays open to treat patients.
* **SHA (Social Health Authority)**
  * *What it is:* Kenya's national health insurance system designed to pool money and pay for citizens' healthcare.
  * *AfyaCapital Example:* SHA is the "slow payer." We exist because SHA takes a long time to send money.
* **openIMIS**
  * *What it is:* A free, open-source software platform used by countries to run health insurance systems.
  * *AfyaCapital Example:* We talk to openIMIS to confirm if a submitted bill is legitimate before lending money against it.
* **FHIR (Fast Healthcare Interoperability Resources)**
  * *What it is:* The global standard rulebook for how healthcare computer systems format and share data.
  * *AfyaCapital Example:* We use FHIR formatting to pull the exact financial value of a medical bill without crashing the clinic's software.
* **Claims**
  * *What it is:* The official, itemized bill a healthcare provider sends to an insurance company.
  * *AfyaCapital Example:* Claims are the "collateral." We look at the value of unpaid claims to decide how much money to lend.
* **Claims Adjudication**
  * *What it is:* The final decision-making step where the insurance software decides exactly how much of the claim it will pay.
  * *AfyaCapital Example:* We advance money based on the *adjudicated* amount, ensuring we don't lend KES 1,000 when the government will only pay KES 800.
* **Risk Scoring**
  * *What it is:* A mathematical grade used to determine how likely it is that a loan will be paid back.
  * *AfyaCapital Example:* We score clinic risk based on how often openIMIS approves their medical claims.
* **Working Capital & Cash Flow Problems**
  * *What it is:* The cash a business has immediately available to spend. A cash flow problem is when a business is making money, but the cash hasn't arrived yet.
  * *AfyaCapital Example:* A clinic is owed KES 1,000,000 but cannot pay its KES 50,000 electric bill today. We turn future money (claims) into today's money (advances).
* **Fraud Detection**
  * *What it is:* Using rules or algorithms to catch people who are lying to steal money.
  * *AfyaCapital Example:* We rely heavily on openIMIS's fraud detection. If openIMIS flags a claim as suspicious, we deny the cash advance.

---

## 🤝 Contributing & PR Instructions

### Opening a Draft PR on openIMIS

To fulfill the hackathon requirements:

1. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/afyacapital-claims-factoring
   ```
2. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: Add claims factoring integration"
   git push origin feature/afyacapital-claims-factoring
   ```
3. **Tag the commit:**
   ```bash
   git tag -a v1.0-hackathon -m "AfyaCapital Hackathon Submission v1.0"
   git push origin v1.0-hackathon
   ```
4. **Open a Draft Pull Request** on the official openIMIS repository (`openimis-be_py` or `openimis-fe_js`), selecting your fork and branch, and click **"Create Draft Pull Request"**.

---

## 📄 License

This project is licensed under the terms of the openIMIS license. Built with ❤️ for the openIMIS Hackathon 2026.
