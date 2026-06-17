import { getTimestamp } from '../support/utils';
import { CALC_RULES, PAYROLL_STATUS, TIMEOUTS } from '../support/constants';

// Reconciliation E2E coverage.
//
// The reconciliation feature lets an operator: (1) download a CSV listing one
// row per benefit consumption on an APPROVE_FOR_PAYMENT payroll, with the BE-
// computed Amount per beneficiary; (2) edit the trailing `Receipt` and `Paid`
// columns to mark which beneficiaries received money; (3) upload the edited
// CSV back, flipping each `Paid=Yes` row's BenefitConsumption.status from
// ACCEPTED → RECONCILED and (when ALL rows are reconciled) advancing the
// payroll status to RECONCILED.
//
// Both tests below drive download + upload via the UI (Download button +
// "Upload Payment Data" dialog).  The upload dialog only renders when
// paymentMethod === 'StrategyOfflinePayment' (FE gating in PayrollTab.js); at
// the API layer the endpoint accepts uploads regardless of method, but to
// exercise the button the tests have to use the offline strategy.

const getDateOffset = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const beneficiarySchema = {
  $id: 'https://example.com/beneficiares.schema.json',
  type: 'object',
  title: 'Reconciliation Beneficiary Schema',
  $schema: 'http://json-schema.org/draft-04/schema#',
  properties: {
    able_bodied: { type: 'boolean', description: 'Able bodied flag' },
    educated_level: { type: 'string', description: 'Education level' },
    number_of_children: { type: 'integer', description: 'Number of children' },
  },
};

// Fetch enrolled beneficiary identities (sorted by full name) for a program
// via the GraphQL API.  Returns a chained array of `"<First> <Last>"` strings.
// Individual has no `code` field — beneficiary identity in this codebase is
// effectively (firstName, lastName) (plus dob, but names alone are unique
// enough for the test fixture's individuals).  We filter by benefit plan
// CODE (8-char unique) rather than name to avoid graphene-django field
// mapping quirks with `iexact`.
function getEnrolledBeneficiaryNames(programCode) {
  return cy.request({
    method: 'POST',
    url: '/api/graphql',
    body: {
      query: `query Beneficiaries($code: String) {
        beneficiary(benefitPlan_Code_Iexact: $code, isDeleted: false, first: 100) {
          edges { node { individual { firstName lastName } } }
        }
      }`,
      variables: { code: programCode },
    },
  }).then((res) => {
    expect(res.status, 'beneficiary GQL status').to.eq(200);
    if (res.body?.errors) {
      // Surface the actual server error so a future failure isn't a silent ?? [].
      throw new Error(`Beneficiary GQL errors: ${JSON.stringify(res.body.errors)}`);
    }
    const edges = res.body?.data?.beneficiary?.edges ?? [];
    const names = edges.map((e) => `${e.node.individual.firstName} ${e.node.individual.lastName}`);
    names.sort((a, b) => a.localeCompare(b));
    return cy.wrap(names);
  });
}

// ---------------------------------------------------------------------------
//                          A. Cash Transfer (Social Protection)
// ---------------------------------------------------------------------------

describe('Payroll reconciliation — cash transfer (social protection calcrule)', () => {
  const suiteTimestamp = getTimestamp();
  const ts = Date.now();
  const programCode = `RC${ts.toString().slice(-6)}`;
  const programName = `E2E Recon CT Program ${suiteTimestamp}`;
  const ppCode = `RP${ts.toString().slice(-6)}`;
  const ppName = `E2E Recon CT Plan ${suiteTimestamp}`;
  const cycleCode = `RCC${ts.toString().slice(-5)}`;
  const fixedAmount = '1000';
  const payrollName = `E2E Recon CT Payroll ${suiteTimestamp}`;

  let enrolledCount = 0;

  before(() => {
    cy.loginAdminInterface();
    cy.setModuleConfig('fe-core', 'menu-config-sp.json');
    cy.setModuleConfig('social_protection', 'social-protection-config.json');
    cy.setModuleConfig('individual', 'individual-config-minimal.json');
    cy.logoutAdminInterface();

    cy.login();

    // 1. Program with the standard beneficiary schema.
    cy.createProgram(programCode, programName, '50', 'INDIVIDUAL', beneficiarySchema);

    // 2. Enroll a deterministic cohort.  `Able bodied = False` is the same
    //    criterion used by the existing timesheet payroll suite — a stable
    //    subset of the loaded individuals fixture.
    cy.configureDefaultEnrollmentCriteria(
      programName, 'Active', 'Able bodied', 'Exact', 'False',
    );
    cy.enrollIndividualBeneficiariesIntoProgram(
      programName, programCode, 'Active', 'Able bodied', 'Exact', 'False',
    );

    // 3. Capture the enrolled count so the CSV row count can be asserted.
    getEnrolledBeneficiaryNames(programCode).then((names) => {
      expect(names.length, 'enrolled beneficiary count').to.be.greaterThan(0);
      enrolledCount = names.length;
    });

    // 4. Payment plan with the social-protection (cash transfer) calc rule.
    cy.createPaymentPlan({
      code: ppCode,
      name: ppName,
      benefitPlanCode: programCode,
      benefitPlanName: programName,
      calculationRule: CALC_RULES.SOCIAL_PROTECTION,
      calculationParams: { 'Fixed amount': fixedAmount },
      dateValidFrom: getDateOffset(0),
      dateValidTo: getDateOffset(365),
    });

    // 5. ACTIVE payment cycle (via maker-checker task workflow).
    cy.ensurePaymentCycleTaskGroup();
    cy.createPaymentCycle({
      code: cycleCode,
      startDate: getDateOffset(0),
      endDate: getDateOffset(30),
      status: 'ACTIVE',
    });
    cy.approveLatestPaymentCycleTask();

    // 6. Payroll using StrategyOfflinePayment so the upload dialog renders.
    cy.createPayroll({
      name: payrollName,
      paymentPlanCode: ppCode,
      paymentPlanName: ppName,
      paymentCycleCode: cycleCode,
      paymentMethod: 'StrategyOfflinePayment',
      dateValidFrom: getDateOffset(0),
      dateValidTo: getDateOffset(30),
    });

    // 7. Approve the accept_payroll task → APPROVE_FOR_PAYMENT.
    cy.approveAcceptPayrollTask(payrollName);

    cy.logout();
  });

  after(() => {
    cy.login();
    // Once a payroll is APPROVE_FOR_PAYMENT/RECONCILED the UI delete is
    // disabled — there is no straightforward way to remove it from the list,
    // so test records accumulate.  Clean up the plan + program only.
    cy.deletePaymentPlan(ppName);
    cy.deleteProgram(programName);
    cy.logout();
  });

  beforeEach(() => {
    cy.login();
  });

  it('downloads the reconciliation template with per-beneficiary fixed amount', () => {
    cy.openPayrollForViewFromList(payrollName);
    cy.assertPayrollDetailFields({ name: payrollName, status: PAYROLL_STATUS.APPROVE_FOR_PAYMENT });

    cy.downloadReconciliationFromUI().then(({ headers, rows }) => {
      // Header row matches the BE template exactly.
      expect(headers).to.deep.eq([
        'Payroll Name', 'Payroll Status', 'First Name', 'Last Name', 'Date of Birth',
        'Code', 'Status', 'Amount', 'Type', 'Receipt', 'Paid',
      ]);

      // One row per enrolled beneficiary; each row pre-populated with the
      // BE-computed fixed amount.
      expect(rows).to.have.length(enrolledCount);

      rows.forEach((row) => {
        expect(row['Payroll Name']).to.eq(payrollName);
        // CSV column carries the raw enum (with underscores), not the UI label.
        expect(row['Payroll Status']).to.eq('APPROVE_FOR_PAYMENT');
        expect(row.Status).to.eq('ACCEPTED');
        expect(parseFloat(row.Amount)).to.eq(parseFloat(fixedAmount));
        expect(row.Receipt).to.eq('');
        expect(row.Paid).to.eq('');
      });
    });
  });

  it('uploads a fully-reconciled CSV and transitions the payroll to RECONCILED', () => {
    cy.openPayrollForViewFromList(payrollName);

    cy.downloadReconciliationFromUI().then(({ rows }) => {
      const reconciledRows = rows.map((r) => ({
        ...r,
        Receipt: `RCT-${r.Code}-001`,
        Paid: 'Yes',
      }));
      cy.buildReconciliationCsv(reconciledRows).then((csvText) => {
        cy.uploadReconciliationFromUI(payrollName, csvText);
      });

      const expectedTotal = parseFloat(fixedAmount) * rows.length;

      // The CSV upload flipped per-row BenefitConsumption status to RECONCILED
      // but the payroll itself stays at APPROVE_FOR_PAYMENT.  The summary
      // dialog (still reachable from /front/payrollsApproved) should now show
      // every beneficiary as reconciled.
      cy.assertReconciliationSummary(payrollName, {
        selected: rows.length,
        total: rows.length,
        totalAmount: expectedTotal,
        totalDelivered: expectedTotal,
      });

      // To close out the payroll the operator must click "Approve and Close"
      // on the summary dialog, which emits a payroll_reconciliation task —
      // approving that task transitions the payroll → RECONCILED.
      cy.approveAndClosePayrollFromSummary(payrollName);
      cy.approvePayrollReconciliationTask(payrollName);

      // After approval the detail page reflects the terminal status.  We
      // navigate via /front/payrolls (which lists payrolls of any status).
      cy.openPayrollForViewFromList(payrollName);
      cy.assertMuiInput('Status', PAYROLL_STATUS.RECONCILED);
    });
  });
});

// ---------------------------------------------------------------------------
//                       B. Timesheet (Base Day Rate × days)
// ---------------------------------------------------------------------------

describe('Payroll reconciliation — timesheet (base-day-rate calcrule)', () => {
  const suiteTimestamp = getTimestamp();
  const ts = Date.now();
  const programCode = `RT${ts.toString().slice(-6)}`;
  const programName = `E2E Recon TS Program ${suiteTimestamp}`;
  const projectName = `E2E Recon TS Project ${suiteTimestamp}`;
  const activityName = `E2E Recon TS Activity ${suiteTimestamp}`;
  const ppCode = `RT${ts.toString().slice(-6)}`;
  const ppName = `E2E Recon TS Plan ${suiteTimestamp}`;
  const cycleCode = `RTC${ts.toString().slice(-5)}`;
  const baseDayRate = 100;
  const workingDays = '10';
  const payrollName = `E2E Recon TS Payroll ${suiteTimestamp}`;

  // Day-percent patterns assigned in cohort-index order.  Each array length
  // must equal `workingDays` so every "Work Day N" input in the row is set.
  // Effective days (sum/100) and expected Amount @ BDR=100 noted on the right.
  const DAY_PATTERNS = [
    [100, 100, 100, 100, 100,   0,   0,   0,   0,   0], // 5.0 days → 500
    [100, 100, 100, 100, 100, 100, 100, 100, 100, 100], // 10.0 days → 1000
    [100, 100, 100,  50,  50,   0,   0,   0,   0,   0], // 4.0 days → 400
    [ 50,  50,  50,  50,  50,  50,  50,  50,   0,   0], // 4.0 days → 400
  ];
  const ZERO_DAYS = Array(parseInt(workingDays, 10)).fill(0);
  const expectedAmount = (pattern) => (pattern.reduce((a, b) => a + b, 0) / 100) * baseDayRate;

  // Populated in before(); used by the it() blocks.
  let activeNames = [];           // names with non-zero days (visible in payroll/CSV)
  let expectedAmountByName = {};  // { "First Last": numericAmount }
  let projectPath = null;

  before(() => {
    cy.loginAdminInterface();
    cy.setModuleConfig('fe-core', 'menu-config-sp.json');
    cy.setModuleConfig('social_protection', 'social-protection-config.json');
    cy.setModuleConfig('individual', 'individual-config-minimal.json');

    // Create a uniquely-named Activity via the Django admin so the project
    // foreign-key is stable across test runs.
    cy.visit('/api/admin');
    cy.contains('a', 'Activities').click();
    cy.contains('a', 'Add Activity').click();
    cy.get('input[name="name"]').type(activityName);
    cy.get('input[value="Save"]').click();
    cy.logoutAdminInterface();

    cy.login();

    cy.createProgram(programCode, programName, '50', 'INDIVIDUAL', beneficiarySchema);

    cy.configureDefaultEnrollmentCriteria(
      programName, 'Active', 'Able bodied', 'Exact', 'False',
    );
    cy.enrollIndividualBeneficiariesIntoProgram(
      programName, programCode, 'Active', 'Able bodied', 'Exact', 'False',
    );

    cy.createProject(
      programName, projectName, activityName,
      'R1 Region 1', null, '50', workingDays,
    );
    cy.url().then((url) => { projectPath = new URL(url).pathname; });

    cy.then(() => cy.assignBeneficiariesToProject(projectPath));

    // Read names directly from the project's bulk-edit table — the same
    // grid that enterProjectTimeEntriesPerBeneficiary will iterate.  This
    // guarantees every key in our daysByText map is a row that exists in
    // that table (no enrolled-but-unassigned mismatch, no FE-vs-BE name
    // ordering surprises).
    cy.then(() => cy.getProjectAssignedBeneficiaryNames(projectPath)).then((names) => {
      // The fixture seeds duplicate first/last name pairs across distinct
      // individuals, and the bulk-edit grid lists every assigned record.
      // Drive the cohort off UNIQUE names so each pattern lands on a
      // separate person and shows up as its own CSV row.
      const uniqueNames = [...new Set(names)];
      expect(uniqueNames.length, 'unique assigned count').to.be.gte(DAY_PATTERNS.length + 1);
      activeNames = uniqueNames.slice(0, DAY_PATTERNS.length);
      expectedAmountByName = Object.fromEntries(
        activeNames.map((name, i) => [name, expectedAmount(DAY_PATTERNS[i])]),
      );

      // daysByText keys are unique names too — enterProjectTimeEntriesPerBeneficiary
      // uses `.find()` which only addresses the first matching row anyway.
      const daysByText = Object.fromEntries(uniqueNames.map((name) => {
        const idx = activeNames.indexOf(name);
        return [name, idx >= 0 ? DAY_PATTERNS[idx] : ZERO_DAYS];
      }));
      cy.then(() => cy.enterProjectTimeEntriesPerBeneficiary(projectPath, daysByText));
    });

    cy.then(() => cy.updateProjectStatus(projectPath, 'Completed'));

    cy.createPaymentPlan({
      code: ppCode,
      name: ppName,
      benefitPlanCode: programCode,
      benefitPlanName: programName,
      calculationRule: CALC_RULES.TIMESHEET,
      calculationParams: { 'Base Day Rate': String(baseDayRate) },
      dateValidFrom: getDateOffset(0),
    });

    cy.ensurePaymentCycleTaskGroup();
    cy.createPaymentCycle({
      code: cycleCode,
      startDate: getDateOffset(0),
      endDate: getDateOffset(30),
      status: 'ACTIVE',
    });
    cy.approveLatestPaymentCycleTask();

    cy.createPayroll({
      name: payrollName,
      paymentPlanCode: ppCode,
      paymentPlanName: ppName,
      paymentCycleCode: cycleCode,
      paymentMethod: 'StrategyOfflinePayment',
      dateValidFrom: getDateOffset(0),
      dateValidTo: getDateOffset(30),
    });
    cy.approveAcceptPayrollTask(payrollName);
    cy.logout();
  });

  after(() => {
    cy.login();
    cy.deletePaymentPlan(ppName);
    if (projectPath) cy.deleteProject(projectPath);
    cy.deleteProgram(programName);
    cy.logout();
  });

  beforeEach(() => {
    cy.login();
  });

  it('downloads the template and asserts per-row Amount = days × BDR', () => {
    cy.openPayrollForViewFromList(payrollName);
    cy.assertPayrollDetailFields({ name: payrollName, status: PAYROLL_STATUS.APPROVE_FOR_PAYMENT });

    cy.downloadReconciliationFromUI().then(({ rows }) => {
      // Beneficiaries with zero days are excluded from the payroll, so the
      // CSV row count must equal exactly the active cohort size.
      expect(rows).to.have.length(activeNames.length);

      const byName = (a, b) => a.localeCompare(b);
      const downloadedNames = rows.map((r) => `${r['First Name']} ${r['Last Name']}`).sort(byName);
      expect(downloadedNames).to.deep.eq([...activeNames].sort(byName));

      rows.forEach((row) => {
        const fullName = `${row['First Name']} ${row['Last Name']}`;
        expect(parseFloat(row.Amount), `Amount for ${fullName}`)
          .to.eq(expectedAmountByName[fullName]);
        expect(row.Status).to.eq('ACCEPTED');
        expect(row.Paid).to.eq('');
      });
    });
  });

  it('uploads partial reconciliation, then completes, asserting summary at each stage', () => {
    cy.openPayrollForViewFromList(payrollName);

    cy.downloadReconciliationFromUI().then(({ rows }) => {
      // Stage 1: mark only the first half (alphabetical by name) as paid.
      const fullName = (r) => `${r['First Name']} ${r['Last Name']}`;
      const half = Math.ceil(rows.length / 2);
      const partialPaidNames = new Set(
        rows.slice().sort((a, b) => fullName(a).localeCompare(fullName(b))).slice(0, half).map(fullName),
      );
      const totalAmount = rows.reduce((acc, r) => acc + parseFloat(r.Amount), 0);
      const partialDelivered = rows
        .filter((r) => partialPaidNames.has(fullName(r)))
        .reduce((acc, r) => acc + parseFloat(r.Amount), 0);

      const partialRows = rows.map((r) => (partialPaidNames.has(fullName(r))
        ? { ...r, Paid: 'Yes', Receipt: `RCT-${r.Code}-1` }
        : r));

      cy.buildReconciliationCsv(partialRows).then((csvText) => {
        cy.uploadReconciliationFromUI(payrollName, csvText);
      });

      // Partial reconciliation: do NOT click Approve and Close yet — leave
      // the payroll at APPROVE_FOR_PAYMENT and verify the summary reports
      // the partial counts.  The CSV upload alone does not change payroll
      // status; only "Approve and Close" + task approval can advance it.
      cy.openPayrollForViewFromList(payrollName);
      cy.assertMuiInput('Status', PAYROLL_STATUS.APPROVE_FOR_PAYMENT);
      cy.assertReconciliationSummary(payrollName, {
        selected: half,
        total: rows.length,
        totalAmount,
        totalDelivered: partialDelivered,
      });

      // Stage 2: re-download (now contains updated statuses for the half) and
      // mark the remaining rows as paid.
      cy.openPayrollForViewFromList(payrollName);
      cy.downloadReconciliationFromUI().then(({ rows: rows2 }) => {
        const finalRows = rows2.map((r) => ({
          ...r,
          Paid: 'Yes',
          Receipt: r.Receipt || `RCT-${r.Code}-2`,
        }));
        cy.buildReconciliationCsv(finalRows).then((csvText) => {
          cy.uploadReconciliationFromUI(payrollName, csvText);
        });
      });

      // After the stage-2 upload all BenefitConsumption rows are RECONCILED,
      // but the payroll itself is still APPROVE_FOR_PAYMENT.
      cy.approveAndClosePayrollFromSummary(payrollName);
      cy.approvePayrollReconciliationTask(payrollName);

      cy.openPayrollForViewFromList(payrollName);
      cy.assertMuiInput('Status', PAYROLL_STATUS.RECONCILED);
    });
  });
});
