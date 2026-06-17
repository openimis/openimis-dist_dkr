import { getTimestamp } from '../support/utils';
import { TIMEOUTS } from '../support/constants';

describe('Payroll workflows', () => {
  const suiteTimestamp = getTimestamp();
  const getDateOffset = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Codes must be ≤ 8 characters (backend limit for program/payment-plan codes).
  const ts = Date.now();
  const programCode = `PR${ts.toString().slice(-6)}`;
  const programName = `E2E Payroll Program ${suiteTimestamp}`;
  const ppCode = `PP${ts.toString().slice(-6)}`;
  const ppName = `E2E Payroll Plan ${suiteTimestamp}`;
  // Payment cycle codes have no documented 8-char limit; use a longer unique value.
  const cycleCode = `PCY${ts.toString().slice(-5)}`;

  const createdPayrolls = new Set();

  const payrollData = (label) => {
    const timestamp = getTimestamp();
    return {
      name: `E2E Payroll ${label} ${timestamp}`,
      paymentPlanCode: ppCode,
      paymentPlanName: ppName,
      paymentCycleCode: cycleCode,
      dateValidFrom: getDateOffset(0),
      dateValidTo: getDateOffset(30),
      // paymentMethod is omitted → first available method is selected
    };
  };

  const trackPayroll = (name) => {
    createdPayrolls.add(name);
  };

  before(() => {
    cy.loginAdminInterface();
    cy.setModuleConfig('fe-core', 'menu-config-sp.json');
    cy.setModuleConfig('social_protection', 'social-protection-config.json');
    cy.setModuleConfig('individual', 'individual-config-minimal.json');
    cy.logoutAdminInterface();

    cy.login();
    cy.createProgram(programCode, programName, '50', 'INDIVIDUAL');
    cy.createPaymentPlan({
      code: ppCode,
      name: ppName,
      benefitPlanName: programName,
      dateValidFrom: getDateOffset(0),
      dateValidTo: getDateOffset(365),
    });

    // The PaymentCyclePicker in the payroll form shows only approved ACTIVE cycles.
    // ACTIVE cycle creation is routed through through a maker-checker task workflow — the cycle is NOT immediately
    // ACTIVE; a task must be approved first.  We work around this by:
    //   1. Ensuring a task group exists that auto-assigns PaymentCycleService
    //      tasks (so the task status becomes ACCEPTED, not RECEIVED).
    //   2. Creating the cycle with status ACTIVE (which creates the task).
    //   3. Approving the task via the UI so the cycle is created as ACTIVE.
    cy.ensurePaymentCycleTaskGroup();
    cy.createPaymentCycle({
      code: cycleCode,
      startDate: getDateOffset(0),
      endDate: getDateOffset(30),
      status: 'ACTIVE',
    });
    cy.approveLatestPaymentCycleTask();
    cy.logout();
  });

  after(() => {
    cy.login();
    // Only PENDING_APPROVAL payrolls have an enabled delete button in the UI.
    // Tests that change the status are responsible for their own cleanup.
    Array.from(createdPayrolls).forEach((name) => {
      cy.deletePayrollFromList(name);
    });
    cy.deletePaymentPlan(ppName);
    cy.deleteProgram(programName);
    // Payment cycles have no UI delete; cycleCode records accumulate in the DB.
    cy.logout();
  });

  beforeEach(() => {
    cy.login();
  });

  it('validates required fields before allowing payroll creation', () => {
    cy.openCreatePayroll();
    cy.assertSaveDisabled();
  });

  it('creates a payroll successfully', () => {
    const payroll = payrollData('Create');

    cy.createPayroll(payroll);
    trackPayroll(payroll.name);

    cy.filterPayrolls({ name: payroll.name });
    cy.assertPayrollRowVisible({ name: payroll.name });

    // Open detail page and verify all fields were persisted.
    cy.openPayrollForViewFromList(payroll.name);
    cy.assertPayrollDetailFields({
      name: payroll.name,
      status: 'PENDING APPROVAL',
      dateValidFrom: payroll.dateValidFrom,
      dateValidTo: payroll.dateValidTo,
      paymentPlanCode: ppCode,
      paymentCycleCode: cycleCode,
    });
    // After creation the form is read-only.
    cy.assertMuiInputDisabled('Name', payroll.name);
  });

  it('searches payrolls by name', () => {
    const targetPayroll = payrollData('Search Target');
    const otherPayroll = payrollData('Search Other');

    cy.createPayroll(targetPayroll);
    cy.createPayroll(otherPayroll);
    trackPayroll(targetPayroll.name);
    trackPayroll(otherPayroll.name);

    cy.filterPayrolls({ name: targetPayroll.name });
    cy.assertPayrollRowVisible({ name: targetPayroll.name });
    cy.assertPayrollRowNotVisible({ name: otherPayroll.name });

    cy.filterPayrolls({ name: otherPayroll.name });
    cy.assertPayrollRowVisible({ name: otherPayroll.name });
    cy.assertPayrollRowNotVisible({ name: targetPayroll.name });
  });

  it('views payroll details from the list', () => {
    const payroll = payrollData('View');

    cy.createPayroll(payroll);
    trackPayroll(payroll.name);

    cy.openPayrollForViewFromList(payroll.name);
    cy.assertPayrollDetailFields({
      name: payroll.name,
      status: 'PENDING APPROVAL',
      dateValidFrom: payroll.dateValidFrom,
      dateValidTo: payroll.dateValidTo,
      paymentPlanCode: ppCode,
      paymentCycleCode: cycleCode,
    });
    // Detail page should be read-only after creation.
    cy.assertMuiInputDisabled('Name', payroll.name);
  });

  it('deletes a PENDING_APPROVAL payroll', () => {
    const payroll = payrollData('Delete');

    cy.createPayroll(payroll);
    // Not tracked: deleted below, so no after() cleanup needed.

    cy.deletePayrollFromList(payroll.name);
    cy.filterPayrolls({ name: payroll.name });
    cy.assertPayrollRowNotVisible({ name: payroll.name });
  });

  it('shows a newly-created payroll in the pending payrolls list', () => {
    const payroll = payrollData('Pending');

    cy.createPayroll(payroll);
    trackPayroll(payroll.name);
    cy.filterPayrolls({ name: payroll.name, visitPending: true });
    cy.assertPayrollRowVisible({ name: payroll.name });
  });

  it('verifies a newly-created payroll has PENDING APPROVAL status', () => {
    const payroll = payrollData('Status Check');

    cy.createPayroll(payroll);
    trackPayroll(payroll.name);

    cy.openPayrollForViewFromList(payroll.name);
    cy.assertPayrollDetailFields({
      name: payroll.name,
      status: 'PENDING APPROVAL',
      dateValidFrom: payroll.dateValidFrom,
    });
  });

  it('opens and closes the reconciliation summary dialog from the pending list', () => {
    const payroll = payrollData('Reconcile Dialog');

    cy.createPayroll(payroll);
    trackPayroll(payroll.name);

    cy.openPayrollPendingSummary(payroll.name);
    cy.contains('button', 'Close').click();
    cy.contains('View Reconciliation Summary:').should('not.exist');
  });

  it('end-to-end: payment plan → payment cycle → payroll integration', () => {
    // This test verifies the full cross-domain flow using the prerequisites
    // already created in before().  A new payroll is created and verified.
    const payroll = payrollData('Integration');

    cy.createPayroll(payroll);
    trackPayroll(payroll.name);

    // Verify payroll appears in main list.
    cy.filterPayrolls({ name: payroll.name });
    cy.assertPayrollRowVisible({ name: payroll.name });

    // Verify payroll appears in pending list (filter by name to avoid pagination).
    cy.visit('/front/payrollsPending');
    cy.contains('Payrolls Found');
    cy.enterMuiInput('Name', payroll.name);
    cy.aliasGraphqlQuery('payroll(', 'pendingPayrollRefresh');
    cy.contains('button', 'Search').click();
    cy.awaitSearcherRefresh('pendingPayrollRefresh');
    cy.assertPayrollRowVisible({ name: payroll.name });

    // Verify detail page shows correct associations.
    cy.openPayrollForViewFromList(payroll.name);
    cy.assertPayrollDetailFields({
      name: payroll.name,
      status: 'PENDING APPROVAL',
      dateValidFrom: payroll.dateValidFrom,
      dateValidTo: payroll.dateValidTo,
      paymentPlanCode: ppCode,
      paymentCycleCode: cycleCode,
    });
    cy.assertMuiInputDisabled('Name', payroll.name);
  });

  it('filters payrolls by status', () => {
    const payroll = payrollData('StatusFilter');

    cy.createPayroll(payroll);
    trackPayroll(payroll.name);

    // All new payrolls are PENDING_APPROVAL. The status filter dropdown uses
    // translated display labels (spaces, not underscores).
    cy.filterPayrolls({ name: payroll.name, status: 'PENDING APPROVAL' });
    cy.assertPayrollRowVisible({ name: payroll.name });

    // Filter by a different status — the payroll should be excluded.
    cy.filterPayrolls({ name: payroll.name, status: 'APPROVE FOR PAYMENT' });
    cy.assertPayrollRowNotVisible({ name: payroll.name });
  });

  it('resets payroll filters and restores full list', () => {
    cy.visit('/front/payrolls');
    cy.contains('Payrolls Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });

    cy.enterMuiInput('Name', 'FAKE_NAME');

    cy.resetPayrollFilters();

    cy.contains('label', 'Name')
      .siblings('.MuiInputBase-root')
      .find('input')
      .should('have.value', '');
  });
});

// --- Timesheet Calcrule Payroll Integration ---

describe('Timesheet calcrule payroll', () => {
  const suiteTimestamp = getTimestamp();
  const getDateOffset = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const ts = Date.now();
  const tsProgramCode = `TS${ts.toString().slice(-6)}`;
  const tsProgramName = `E2E Timesheet Program ${suiteTimestamp}`;
  const tsActivityName = `E2E TS Activity ${suiteTimestamp}`;
  const tsProjectName = `E2E Timesheet Project ${suiteTimestamp}`;
  const tsPpCode = `TP${ts.toString().slice(-6)}`;
  const tsPpName = `E2E Timesheet Plan ${suiteTimestamp}`;
  const tsCycleCode = `TC${ts.toString().slice(-5)}`;
  const baseDayRate = '50';
  let projectPath = null;

  const beneficiarySchema = {
    $id: 'https://example.com/beneficiares.schema.json',
    type: 'object',
    title: 'Timesheet Beneficiary Schema',
    $schema: 'http://json-schema.org/draft-04/schema#',
    properties: {
      able_bodied: { type: 'boolean', description: 'Able bodied flag' },
      educated_level: { type: 'string', description: 'Education level' },
      number_of_children: { type: 'integer', description: 'Number of children' },
    },
  };

  const createdPayrolls = new Set();
  const trackPayroll = (name) => createdPayrolls.add(name);

  before(() => {
    cy.loginAdminInterface();
    cy.setModuleConfig('fe-core', 'menu-config-sp.json');
    cy.setModuleConfig('social_protection', 'social-protection-config.json');
    cy.setModuleConfig('individual', 'individual-config-minimal.json');
    // Use a unique activity name to avoid foreign key conflicts with old projects.
    cy.visit('/api/admin');
    cy.contains('a', 'Activities').click();
    cy.contains('a', 'Add Activity').click();
    cy.get('input[name="name"]').type(tsActivityName);
    cy.get('input[value="Save"]').click();
    cy.logoutAdminInterface();

    cy.login();

    // 1. Create program
    cy.createProgram(tsProgramCode, tsProgramName, '50', 'INDIVIDUAL', beneficiarySchema);

    // 2. Enroll individuals directly as Active.
    cy.configureDefaultEnrollmentCriteria(
      tsProgramName, 'Active',
      'Able bodied', 'Exact', 'False',
    );
    cy.enrollIndividualBeneficiariesIntoProgram(
      tsProgramName, tsProgramCode, 'Active',
      'Able bodied', 'Exact', 'False',
    );

    // 3. Create project under the program
    cy.createProject(
      tsProgramName, tsProjectName, tsActivityName,
      'R1 Region 1', null, '10', '3',
    );
    cy.url().then((url) => { projectPath = new URL(url).pathname; });

    // 4. Assign Active beneficiaries to the project
    cy.then(() => cy.assignBeneficiariesToProject(projectPath));

    // 5. Enter time entries (100% for all days)
    cy.then(() => cy.enterProjectTimeEntries(projectPath, 100));

    // 6. Mark project as COMPLETED
    cy.then(() => cy.updateProjectStatus(projectPath, 'Completed'));

    // 7. Create payment plan with timesheet calcrule
    cy.createPaymentPlan({
      code: tsPpCode,
      name: tsPpName,
      benefitPlanName: tsProgramName,
      calculationRule: 'Calculation rule: timesheet',
      calculationParams: { 'Base Day Rate': baseDayRate },
      dateValidFrom: getDateOffset(0),
    });

    // 8. Create ACTIVE payment cycle via task approval
    cy.ensurePaymentCycleTaskGroup();
    cy.createPaymentCycle({
      code: tsCycleCode,
      startDate: getDateOffset(0),
      endDate: getDateOffset(30),
      status: 'ACTIVE',
    });
    cy.approveLatestPaymentCycleTask();

    cy.logout();
  });

  after(() => {
    cy.login();
    Array.from(createdPayrolls).forEach((name) => {
      cy.deletePayrollFromList(name);
    });
    cy.deletePaymentPlan(tsPpName);
    if (projectPath) {
      cy.deleteProject(projectPath);
    }
    cy.deleteProgram(tsProgramName);
    cy.logout();
  });

  beforeEach(() => {
    cy.login();
  });

  it('creates a payroll with timesheet-based payment plan', () => {
    const payrollName = `E2E Timesheet Payroll ${suiteTimestamp}`;
    const payroll = {
      name: payrollName,
      paymentPlanCode: tsPpCode,
      paymentPlanName: tsPpName,
      paymentCycleCode: tsCycleCode,
      dateValidFrom: getDateOffset(0),
      dateValidTo: getDateOffset(30),
    };

    cy.createPayroll(payroll);
    trackPayroll(payrollName);

    cy.filterPayrolls({ name: payrollName });
    cy.assertPayrollRowVisible({ name: payrollName });

    cy.openPayrollForViewFromList(payrollName);
    cy.assertPayrollDetailFields({
      name: payrollName,
      status: 'PENDING APPROVAL',
      dateValidFrom: payroll.dateValidFrom,
      dateValidTo: payroll.dateValidTo,
      paymentPlanCode: tsPpCode,
      paymentCycleCode: tsCycleCode,
    });
    cy.assertMuiInputDisabled('Name', payrollName);
  });
});
