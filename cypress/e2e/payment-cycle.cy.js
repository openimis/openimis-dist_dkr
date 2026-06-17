import { getTimestamp } from '../support/utils';
import { TIMEOUTS } from '../support/constants';

describe('Payment cycle workflows', () => {
  const getDateOffset = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  let codeSeq = 0;
  const cycleData = () => {
    // Reuse getTimestamp() for the datetime portion; a per-run counter keeps
    // the code unique across same-millisecond calls without a PRNG.
    codeSeq += 1;
    const uniquePart = `${getTimestamp().replace(/[^0-9]/g, '').slice(-6)}${codeSeq.toString(36).toUpperCase().padStart(2, '0')}`;
    return {
      // Code field max length is not as restrictive as program codes; use a short prefix
      // to keep within any backend limits while still being unique per test run.
      code: `PC${uniquePart}`,
      startDate: getDateOffset(0),
      endDate: getDateOffset(30),
      status: 'PENDING',
    };
  };

  // Payment cycles have no delete action in the UI, so created test records
  // accumulate in the database.  Use unique codes per run to avoid conflicts.

  before(() => {
    // Ensure a task group exists for PaymentCycleService tasks so ACTIVE
    // cycle creation tasks are auto-assigned (ACCEPTED) and can be approved.
    cy.login();
    cy.ensurePaymentCycleTaskGroup();
    cy.logout();
  });

  beforeEach(() => {
    cy.login();
  });

  // --- Search & filter ---
  it('searches payment cycles by code', () => {
    const targetCycle = cycleData();
    const otherCycle = cycleData();

    cy.createPaymentCycle(targetCycle);
    cy.createPaymentCycle(otherCycle);

    cy.filterPaymentCycles({ code: targetCycle.code });
    cy.assertPaymentCycleRowVisible({ code: targetCycle.code });
    cy.assertPaymentCycleRowNotVisible({ code: otherCycle.code });

    cy.filterPaymentCycles({ code: otherCycle.code });
    cy.assertPaymentCycleRowVisible({ code: otherCycle.code });
    cy.assertPaymentCycleRowNotVisible({ code: targetCycle.code });
  });

  it('filters payment cycles by status', () => {
    const pendingCycle = cycleData();
    const suspendedCycle = cycleData();

    cy.createPaymentCycle({ ...pendingCycle, status: 'PENDING' });
    cy.createPaymentCycle({ ...suspendedCycle, status: 'SUSPENDED' });

    // Verify the status filter EXCLUDES cycles with a different status.
    cy.filterPaymentCycles({ status: 'PENDING' });
    cy.assertPaymentCycleRowNotVisible({ code: suspendedCycle.code });

    cy.filterPaymentCycles({ status: 'SUSPENDED' });
    cy.assertPaymentCycleRowNotVisible({ code: pendingCycle.code });
  });

  it('filters payment cycles by date range (Date From / Date To)', () => {
    const cycle = cycleData();

    cy.createPaymentCycle(cycle);

    // A "Date From" filter in the far future must exclude this cycle (its
    // startDate is today).
    cy.filterPaymentCycles({ code: cycle.code, dateFrom: getDateOffset(365) });
    cy.assertPaymentCycleRowNotVisible({ code: cycle.code });

    // A "Date From" filter in the past includes it.
    cy.filterPaymentCycles({ code: cycle.code, dateFrom: getDateOffset(-365) });
    cy.assertPaymentCycleRowVisible({ code: cycle.code });
  });

  it('resets payment cycle filters and restores full list', () => {
    cy.visit('/front/paymentCycles');
    cy.contains('Payment Cycles Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);

    cy.enterMuiInput('Code', 'FAKE_CODE');

    cy.resetPaymentCycleFilters();

    cy.assertMuiInput('Code', '');
  });

  it('creates a payment cycle and immediately searches for it', () => {
    const cycle = cycleData();

    cy.createPaymentCycle(cycle);

    cy.filterPaymentCycles({ code: cycle.code });
    cy.assertPaymentCycleRowVisible({ code: cycle.code });
  });

  it('payroll form Payment Cycle picker excludes non-ACTIVE cycles', () => {
    // The PaymentCyclePicker used on the payroll create form queries
    // paymentCycle with `status: ACTIVE`, so a PENDING cycle must never
    // appear in its autocomplete options.
    const pendingCycle = cycleData();

    cy.createPaymentCycle(pendingCycle);

    cy.visit('/front/payrolls');
    cy.contains('Payrolls Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });
    cy.clickCreate();
    cy.url({ timeout: TIMEOUTS.BACKEND_VALIDATION }).should('include', '/payrolls/payroll');

    // The cycle picker fires a GraphQL query with `status: ACTIVE` on input
    // change — alias it so we can await the response before asserting.
    cy.aliasGraphqlQuery('paymentCycle(', 'cyclePickerFetch');

    cy.contains('label', 'Payment Cycle', { timeout: TIMEOUTS.BACKEND_VALIDATION })
      .siblings('.MuiInputBase-root')
      .find('input')
      .click({ force: true })
      .clear({ force: true })
      .type(pendingCycle.code, { force: true });
    cy.wait('@cyclePickerFetch', { timeout: TIMEOUTS.BACKEND_VALIDATION });

    // The PENDING cycle code must not appear in any autocomplete listbox option.
    cy.get('body').then(($body) => {
      const options = $body.find('[role="listbox"] li, [role="presentation"] li').toArray();
      const pendingVisible = options.some((li) => li.innerText.includes(pendingCycle.code));
      expect(
        pendingVisible,
        `PENDING cycle ${pendingCycle.code} must not appear in the ACTIVE-filtered picker`,
      ).to.equal(false);
    });
  });


  // --- Creation ---
  it('validates required fields before allowing payment cycle creation', () => {
    cy.openCreatePaymentCycle();
    cy.assertSaveDisabled();
  });

  it('creates a PENDING payment cycle successfully', () => {
    const cycle = cycleData();

    cy.createPaymentCycle(cycle);

    cy.filterPaymentCycles({ code: cycle.code });
    cy.assertPaymentCycleRowVisible({ code: cycle.code, status: cycle.status });
  });

  it('creates an ACTIVE payment cycle via task approval and verifies all fields', () => {
    const cycle = cycleData();

    // ACTIVE cycles route through the maker-checker task workflow:
    // 1. Save creates a task and shows a notification dialog.
    // 2. Approve the task via All Tasks.
    // 3. After approval the cycle is created as ACTIVE.
    cy.createPaymentCycle({ ...cycle, status: 'ACTIVE' });
    cy.approveLatestPaymentCycleTask();

    cy.filterPaymentCycles({ code: cycle.code });
    cy.assertPaymentCycleRowVisible({ code: cycle.code, status: 'ACTIVE' });

    cy.openPaymentCycleForViewFromList(cycle.code);
    cy.assertPaymentCycleDetailFields({ ...cycle, status: 'ACTIVE' });
  });

  it('creates a SUSPENDED payment cycle', () => {
    const cycle = cycleData();

    cy.createPaymentCycle({ ...cycle, status: 'SUSPENDED' });

    cy.filterPaymentCycles({ code: cycle.code });
    cy.assertPaymentCycleRowVisible({ code: cycle.code, status: 'SUSPENDED' });
  });


  // --- Detail & update ---
  it('views payment cycle details from the list', () => {
    const cycle = cycleData();

    cy.createPaymentCycle(cycle);
    cy.openPaymentCycleForViewFromList(cycle.code);
    cy.assertPaymentCycleDetailFields(cycle);
  });

  it('shows read-only fields on the detail page', () => {
    const cycle = cycleData();

    cy.createPaymentCycle(cycle);
    cy.openPaymentCycleForViewFromList(cycle.code);

    cy.assertMuiInputDisabled('Code', cycle.code);
    cy.assertMuiInputDisabled('Start Date', cycle.startDate);
    cy.assertMuiInputDisabled('End Date');
    cy.assertMuiSelectValue('Status', 'PENDING');
  });

  it('blocks save when the code is changed to a duplicate value', () => {
    const existingCycle = cycleData();
    const newCycle = cycleData();

    cy.createPaymentCycle(existingCycle);

    cy.openCreatePaymentCycle();
    cy.fillPaymentCycleForm(newCycle);
    cy.assertSaveEnabled();

    cy.enterMuiInput('Code', existingCycle.code);
    cy.assertSaveDisabled();
  });

});
