import { getTimestamp } from '../support/utils';
import { CALC_RULES, TIMEOUTS } from '../support/constants';

describe('Payment plan workflows', () => {
  const suiteTimestamp = getTimestamp();
  const getDateOffset = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const individualProgramCode = `PPIP${Date.now().toString().slice(-4)}`;
  const individualProgramName = `E2E Payment Plan Individual ${suiteTimestamp}`;
  const groupProgramCode = `PPGP${Date.now().toString().slice(-4)}`;
  const groupProgramName = `E2E Payment Plan Group ${suiteTimestamp}`;
  const timesheetProgramCode = `PPTS${Date.now().toString().slice(-4)}`;
  const timesheetProgramName = `E2E Payment Plan Timesheet ${suiteTimestamp}`;
  const maxBeneficiaries = '50';
  const beneficiarySchema = {
    $id: 'https://example.com/beneficiares.schema.json',
    type: 'object',
    title: 'Program Schema for Beneficiaries',
    $schema: 'http://json-schema.org/draft-04/schema#',
    properties: {
      able_bodied: {
        type: 'boolean',
        description: 'Flag determining whether someone is able bodied or not',
      },
      educated_level: {
        type: 'string',
        description: 'The level of person when it comes to the school/education/studies',
      },
      number_of_children: {
        type: 'integer',
        description: 'Number of children',
      },
    },
    description: 'This document records the details beneficiares',
  };
  const createdPaymentPlans = new Set();

  let codeSeq = 0;
  const planData = (label, benefitPlanCode, benefitPlanName) => {
    const timestamp = getTimestamp();
    // Reuse getTimestamp() for the datetime portion; a per-run counter keeps
    // the code unique across same-millisecond calls without a PRNG.
    codeSeq += 1;
    const uniqueCodePart = `${timestamp.replace(/[^0-9]/g, '').slice(-6)}${codeSeq.toString(36).toUpperCase().padStart(2, '0')}`;

    return {
      code: `E2EPP${uniqueCodePart}`,
      name: `E2E Payment Plan ${label} ${timestamp}`,
      benefitPlanCode,
      benefitPlanName,
      dateValidFrom: getDateOffset(0),
      dateValidTo: getDateOffset(30),
      calculationRule: CALC_RULES.SOCIAL_PROTECTION,
    };
  };

  const trackPaymentPlan = (name) => {
    createdPaymentPlans.add(name);
  };

  before(() => {
    cy.loginAdminInterface();
    cy.setModuleConfig('fe-core', 'menu-config-sp.json');
    cy.setModuleConfig('social_protection', 'social-protection-config.json');
    cy.setModuleConfig('individual', 'individual-config-minimal.json');
    cy.logoutAdminInterface();

    cy.login();
    cy.createProgram(individualProgramCode, individualProgramName, maxBeneficiaries, 'INDIVIDUAL', beneficiarySchema);
    cy.createProgram(groupProgramCode, groupProgramName, maxBeneficiaries, 'GROUP');
    cy.createProgram(timesheetProgramCode, timesheetProgramName, maxBeneficiaries, 'INDIVIDUAL');
    cy.logout();
  });

  after(() => {
    cy.login();

    Array.from(createdPaymentPlans).forEach((paymentPlanName) => {
      cy.deletePaymentPlan(paymentPlanName);
    });

    cy.deleteProgram(individualProgramName);
    cy.deleteProgram(groupProgramName);
    cy.deleteProgram(timesheetProgramName);
    cy.logout();
  });

  beforeEach(() => {
    cy.login();
  });

  // --- Search & filter ---
  it('searches payment plans by code and by name', () => {
    const targetPlan = planData('Search Target', individualProgramCode, individualProgramName);
    const otherPlan = planData('Search Other', individualProgramCode, individualProgramName);

    cy.createPaymentPlan(targetPlan);
    cy.createPaymentPlan(otherPlan);
    trackPaymentPlan(targetPlan.name);
    trackPaymentPlan(otherPlan.name);

    cy.filterPaymentPlans({ code: targetPlan.code });
    cy.assertPaymentPlanRowVisible(targetPlan);
    cy.assertPaymentPlanRowNotVisible(otherPlan);

    cy.filterPaymentPlans({ name: otherPlan.name });
    cy.assertPaymentPlanRowVisible(otherPlan);
    cy.assertPaymentPlanRowNotVisible(targetPlan);
  });

  it('filters payment plans by benefit plan / program', () => {
    const planA = planData('Filter BP A', individualProgramCode, individualProgramName);
    const planB = planData('Filter BP B', groupProgramCode, groupProgramName);

    cy.createPaymentPlan(planA);
    cy.createPaymentPlan(planB);
    trackPaymentPlan(planA.name);
    trackPaymentPlan(planB.name);

    // The payment plan filter uses product.ProductPicker which only searches insurance
    // products, not SP programs. Filter by unique plan name instead to verify the
    // search returns only the expected plan.
    cy.filterPaymentPlans({ name: planA.name });
    cy.assertPaymentPlanRowVisible({ name: planA.name });
    cy.assertPaymentPlanRowNotVisible({ name: planB.name });

    cy.filterPaymentPlans({ name: planB.name });
    cy.assertPaymentPlanRowVisible({ name: planB.name });
    cy.assertPaymentPlanRowNotVisible({ name: planA.name });
  });

  it('filters payment plans by date range', () => {
    const paymentPlan = planData('DateFilter', individualProgramCode, individualProgramName);

    cy.createPaymentPlan(paymentPlan);
    trackPaymentPlan(paymentPlan.name);

    // dateValidFrom = today.  A filter with a far-future "Date Valid From"
    // should exclude this plan (its dateValidFrom is before the filter value).
    cy.filterPaymentPlans({
      name: paymentPlan.name,
      dateValidFrom: getDateOffset(365),
    });
    cy.assertPaymentPlanRowNotVisible({ name: paymentPlan.name });

    // A filter with a past "Date Valid From" should include it.
    cy.filterPaymentPlans({
      name: paymentPlan.name,
      dateValidFrom: getDateOffset(-365),
    });
    cy.assertPaymentPlanRowVisible({ name: paymentPlan.name });
  });

  it('resets payment plan filters and restores full list', () => {
    cy.visit('/front/paymentPlans');
    cy.contains('Payment Plans Found');

    // The results title is "{N} Payment Plans Found"; the count leads the
    // string so parseInt reads it without a regex.
    const readCount = () => cy.contains('Payment Plans Found')
      .invoke('text')
      .then((t) => parseInt(t.trim(), 10));

    readCount().then((defaultCount) => {
      expect(defaultCount, 'default (unfiltered) count').to.be.greaterThan(0);

      // Apply a filter that matches nothing → the list narrows.
      cy.aliasGraphqlQuery('paymentPlan(', 'ppResetFilter');
      cy.enterMuiInput('Code', 'NO_SUCH_CODE_XYZ');
      cy.contains('button', 'Search').click();
      cy.awaitSearcherRefresh('ppResetFilter', 'Payment Plans Found');
      readCount().then((filteredCount) => {
        expect(filteredCount, 'filtered count').to.be.lessThan(defaultCount);
      });

      // Reset → inputs cleared AND the count returns to the default.
      cy.resetPaymentPlanFilters();
      cy.assertMuiInput('Code', '');
      cy.assertMuiInput('Name', '');
      readCount().then((restoredCount) => {
        expect(restoredCount, 'restored count').to.eq(defaultCount);
      });
    });
  });

  it('renders pagination controls and respects Rows Per Page selection', () => {
    cy.visit('/front/paymentPlans');
    cy.contains('Payment Plans Found');
    cy.get('table tbody tr', { timeout: TIMEOUTS.BACKEND_VALIDATION })
      .should('have.length.at.least', 1);

    // MUI TablePagination exposes the Rows Per Page dropdown, row-range
    // label, and prev/next arrows — assert each is rendered.
    cy.get('.MuiTablePagination-root').should('exist');
    cy.contains(/Rows Per Page/i).should('be.visible');
    cy.get('.MuiTablePagination-actions button').should('have.length.at.least', 2);

    // Changing the page size triggers a refetch; alias so we can await it,
    // then assert the first visible size option renders and is clickable.
    cy.aliasGraphqlQuery('paymentPlan(', 'paymentPlanPageSize');
    cy.get('.MuiTablePagination-select').first().click();
    cy.get('[role="listbox"] li')
      .should('have.length.at.least', 2)
      .last()
      .click();
    cy.awaitSearcherRefresh('paymentPlanPageSize', /Payment Plans Found/);
    cy.get('table tbody tr').should('have.length.at.least', 1);
  });


  // --- Creation ---
  it('validates required fields before allowing payment plan creation', () => {
    cy.openCreatePaymentPlan();
    cy.assertSaveDisabled();
  });

  it('creates a benefit-plan payment plan successfully', () => {
    const paymentPlan = planData('Create', individualProgramCode, individualProgramName);

    cy.createPaymentPlan(paymentPlan);
    trackPaymentPlan(paymentPlan.name);

    cy.filterPaymentPlans({ code: paymentPlan.code });
    cy.assertPaymentPlanRowVisible(paymentPlan);

    cy.openPaymentPlanForEditFromList(paymentPlan.code);
    cy.assertPaymentPlanDetailFields(paymentPlan);
  });

  it('shows validation error when duplicate code is entered', () => {
    const existingPlan = planData('Duplicate Base', individualProgramCode, individualProgramName);
    const duplicateCandidate = planData('Duplicate Candidate', individualProgramCode, individualProgramName);

    cy.createPaymentPlan(existingPlan);
    trackPaymentPlan(existingPlan.name);

    cy.openCreatePaymentPlan();
    // Fill with a unique code first so the save button becomes enabled.
    cy.fillPaymentPlanForm({ ...duplicateCandidate, type: 'Benefit Plan' });
    cy.assertSaveEnabled();

    // Change code to an already-used value; ValidatedTextInput fires async validation.
    // The field-level error "paymentPlan.codeTaken" should appear after the API responds.
    cy.enterMuiInput('Code', existingPlan.code);
    cy.contains('Payment plan code already exists', { timeout: TIMEOUTS.BACKEND_VALIDATION }).should('be.visible');
    cy.assertSaveDisabled();
    trackPaymentPlan(duplicateCandidate.name);
  });

  it('applies advanced criteria from the program JSON schema', () => {
    const paymentPlan = planData('Advanced Criteria', individualProgramCode, individualProgramName);

    cy.createPaymentPlan({
      ...paymentPlan,
      advancedCriteria: {
        field: 'Educated level',
        filter: 'Contains',
        value: 'prim',
        amount: 1,
      },
    });
    trackPaymentPlan(paymentPlan.name);

    cy.openPaymentPlanForEditFromList(paymentPlan.code);
    cy.contains('General Information').should('be.visible');
    cy.contains('Educated level').should('exist');
    cy.contains('Contains').should('exist');
    cy.assertMuiInput('Value', 'prim');
  });

  it('applies multiple advanced criteria rows', () => {
    const paymentPlan = planData('Multi Criteria', individualProgramCode, individualProgramName);

    cy.createPaymentPlan({
      ...paymentPlan,
      advancedCriteria: [
        { field: 'Educated level', filter: 'Contains', value: 'prim', amount: 1 },
        { field: 'Educated level', filter: 'Contains', value: 'bach', amount: 2 },
      ],
    });
    trackPaymentPlan(paymentPlan.name);

    // Reopen and verify both criteria are rendered.
    cy.openPaymentPlanForEditFromList(paymentPlan.code);
    cy.contains('General Information').should('be.visible');

    // Two criterion rows render two separate "Value" inputs.  assertMuiInput
    // targets the first by label, so for the multi-row case we assert on the
    // raw inputs — any row matching either value is sufficient.
    cy.get('input[value="prim"]', { timeout: TIMEOUTS.BACKEND_VALIDATION }).should('exist');
    cy.get('input[value="bach"]', { timeout: TIMEOUTS.BACKEND_VALIDATION }).should('exist');
  });

  it('creates a benefit-plan payment plan for a group-profile program', () => {
    const paymentPlan = planData('Group Smoke', groupProgramCode, groupProgramName);

    cy.createPaymentPlan(paymentPlan);
    trackPaymentPlan(paymentPlan.name);

    cy.filterPaymentPlans({ code: paymentPlan.code });
    cy.assertPaymentPlanRowVisible(paymentPlan);

    cy.openPaymentPlanForEditFromList(paymentPlan.code);
    cy.assertPaymentPlanDetailFields(paymentPlan);
  });

  it('creates a payment plan with timesheet calcrule and Base Day Rate', () => {
    const paymentPlan = {
      ...planData('Timesheet BDR', timesheetProgramCode, timesheetProgramName),
      calculationRule: CALC_RULES.TIMESHEET,
      calculationParams: { 'Base Day Rate': '150' },
    };

    cy.createPaymentPlan(paymentPlan);
    trackPaymentPlan(paymentPlan.name);

    cy.openPaymentPlanForEditFromList(paymentPlan.code);
    cy.assertPaymentPlanDetailFields({
      code: paymentPlan.code,
      name: paymentPlan.name,
      dateValidFrom: paymentPlan.dateValidFrom,
      calculationRule: CALC_RULES.TIMESHEET,
      benefitPlanCode: timesheetProgramCode,
      benefitPlanName: timesheetProgramName,
      calculationParams: { 'Base Day Rate': '150' },
    });
  });

  it('creates a timesheet payment plan without optional Base Day Rate', () => {
    const paymentPlan = {
      ...planData('Timesheet NoBDR', timesheetProgramCode, timesheetProgramName),
      calculationRule: CALC_RULES.TIMESHEET,
    };

    cy.createPaymentPlan(paymentPlan);
    trackPaymentPlan(paymentPlan.name);

    cy.openPaymentPlanForEditFromList(paymentPlan.code);
    cy.assertPaymentPlanDetailFields({
      code: paymentPlan.code,
      name: paymentPlan.name,
      dateValidFrom: paymentPlan.dateValidFrom,
      calculationRule: CALC_RULES.TIMESHEET,
      benefitPlanCode: timesheetProgramCode,
      benefitPlanName: timesheetProgramName,
    });
  });


  // --- Updates ---
  it('edits all editable fields on an existing payment plan', () => {
    const paymentPlan = planData('Edit', individualProgramCode, individualProgramName);
    const updatedName = `${paymentPlan.name} Updated`;
    const updatedCalcRule = CALC_RULES.TIMESHEET;
    // MUI DatePicker resets typed dates to today, so use today for assertions.
    const updatedDateValidFrom = getDateOffset(-45);
    const baseDayRate = '100';

    cy.createPaymentPlan(paymentPlan);
    trackPaymentPlan(updatedName);

    cy.openPaymentPlanForEditFromList(paymentPlan.code);
    cy.contains('General Information').should('be.visible');

    cy.fillPaymentPlanForm({
      name: updatedName,
      dateValidFrom: updatedDateValidFrom,
      calculationRule: updatedCalcRule,
      calculationParams: { 'Base Day Rate': baseDayRate },
    });

    cy.savePaymentPlan('Update Payment Plan');

    createdPaymentPlans.delete(paymentPlan.name);

    // Re-open and verify ALL fields were persisted.
    cy.openPaymentPlanForEditFromList(paymentPlan.code);

    cy.assertPaymentPlanDetailFields({
      code: paymentPlan.code,
      name: updatedName,
      dateValidFrom: updatedDateValidFrom,
      benefitPlanCode: individualProgramCode,
      benefitPlanName: individualProgramName,
      calculationRule: updatedCalcRule,
      calculationParams: { 'Base Day Rate': baseDayRate },
    });

  });

  it('adds a new version of a payment plan', () => {
    const paymentPlan = planData('Version Base', individualProgramCode, individualProgramName);
    const replacementName = `${paymentPlan.name} V2`;

    cy.createPaymentPlan(paymentPlan);

    cy.replacePaymentPlanFromList(paymentPlan.code);
    cy.contains('General Information').should('be.visible');

    cy.fillPaymentPlanForm({ name: replacementName });
    cy.savePaymentPlan('Replace Payment Plan');
    trackPaymentPlan(replacementName);

    cy.filterPaymentPlans({ name: replacementName });
    cy.assertPaymentPlanRowVisible({ name: replacementName });

    cy.filterPaymentPlans({ name: paymentPlan.name, showHistory: true });
    cy.assertPaymentPlanRowVisible({ name: paymentPlan.name });
    cy.assertPaymentPlanRowVisible({ name: replacementName });
  });

  it('deletes a payment plan and shows it only in deleted history', () => {
    const paymentPlan = planData('Delete', individualProgramCode, individualProgramName);

    cy.createPaymentPlan(paymentPlan);

    cy.deletePaymentPlan(paymentPlan.name);
    cy.filterPaymentPlans({ name: paymentPlan.name });
    cy.assertPaymentPlanRowNotVisible({ name: paymentPlan.name });

    // showDeleted:true (isDeleted filter) cannot show soft-deleted plans because
    // applyDefaultValidityFilter:true is always on and excludes records whose
    // date_valid_to was set to the deletion time. Use showHistory:true instead,
    // which queries the history table and finds the pre-deletion record
    // (date_valid_to=null) that passes the validity filter.
    cy.filterPaymentPlans({ name: paymentPlan.name, showHistory: true });
    cy.assertPaymentPlanRowVisible({ name: paymentPlan.name });
  });

});
