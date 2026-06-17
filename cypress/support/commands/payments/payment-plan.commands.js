import { TIMEOUTS } from '../../constants';

// Fill the calculation-params fields that appear after a calcrule is picked.
// The fields render asynchronously once the backend finishes validating the
// rule, so each label is awaited before typing.
function fillCalculationParams(params) {
  Object.entries(params).forEach(([label, value]) => {
    cy.contains('label', label, { timeout: TIMEOUTS.BACKEND_VALIDATION }).should('be.visible');
    cy.enterMuiInput(label, String(value));
  });
}

// Fill the criterion row at a given index (0-based).  All rows must already
// exist before this is called (i.e. "Add criterion" was clicked once per row).
// Using .eq(index) rather than .last() is stable when multiple rows are
// present: rows are filled in order 0, 1, … so at the time row i is being
// filled, exactly i rows before it already show their Filter/Value/Amount
// labels, making .eq(i) unambiguous for every label type.
function fillCriterionRow(index, { field, filter, value, amount }) {
  // cy.contains('label', text) returns a SINGLE element — .eq(1) on a
  // one-element set always fails.  Use cy.get().filter() to collect ALL
  // matching labels so .eq(index) can address any row.  Add a length
  // guard so Cypress retries until enough rows are in the DOM.
  cy.get('label').filter(':contains("Field")')
    .should('have.length.at.least', index + 1)
    .eq(index)
    .siblings('.MuiInputBase-root')
    .find('[role="button"]')
    .click();
  cy.contains('[role="listbox"] li', field, { timeout: TIMEOUTS.BACKEND_VALIDATION }).click();

  cy.get('label').filter(':contains("Confirm Filters")')
    .should('have.length.at.least', index + 1)
    .eq(index)
    .siblings('.MuiInputBase-root')
    .find('[role="button"]')
    .click();
  cy.contains('[role="listbox"] li', filter).click();

  cy.get('label').filter(':contains("Value")')
    .should('have.length.at.least', index + 1)
    .eq(index)
    .siblings('.MuiInputBase-root')
    .find('input')
    .first()
    .clear({ force: true })
    .type(String(value), { force: true });

  if (amount !== undefined && amount !== null) {
    cy.get('label').filter(':contains("Amount")')
      .should('have.length.at.least', index + 1)
      .eq(index)
      .siblings('.MuiInputBase-root')
      .find('input')
      .first()
      .clear({ force: true })
      .type(String(amount), { force: true });
  }
}

export function registerPaymentPlanCommands() {
  Cypress.Commands.add('assertPaymentPlanDetailFields', ({
    code,
    name,
    dateValidFrom,
    dateValidTo,
    calculationRule,
    benefitPlanCode,
    benefitPlanName,
    calculationParams,
  }) => {
    cy.contains('General Information').should('be.visible');
    cy.assertMuiInput('Code', code);
    cy.assertMuiInput('Name', name);
    cy.assertMuiInput('Valid from', dateValidFrom);
    if (dateValidTo) {
      cy.assertMuiInput('Valid to', dateValidTo);
    }
    if (calculationRule) {
      cy.assertMuiSelectValue('Calculation Rule', calculationRule);
    }
    // Prefer code over name for the Program picker assertion: the picker's
    // displayed value is `${code} ${name}`, and the program name field is
    // prone to typing races during create.  The 8-char code is a reliable
    // identity check.
    if (benefitPlanCode) {
      cy.assertMuiAutoComplete('Program', benefitPlanCode);
    } else if (benefitPlanName) {
      cy.assertMuiAutoComplete('Program', benefitPlanName);
    }
    if (calculationParams) {
      Object.entries(calculationParams).forEach(([label, value]) => {
        cy.assertMuiInput(label, String(value));
      });
    }
  });

  Cypress.Commands.add('openCreatePaymentPlan', () => {
    cy.visit('/front/paymentPlans');
    cy.contains('Payment Plans Found');

    cy.clickCreate('Create new Payment Plan');
    cy.contains('General Information');
  });

  Cypress.Commands.add('fillPaymentPlanForm', ({
    type,
    code,
    name,
    calculationRule,
    calculationParams,
    benefitPlanCode,
    benefitPlanName,
    dateValidFrom,
    dateValidTo,
    advancedCriteria,
  }) => {
    if (type) {
      cy.chooseMuiSelect('Type', type);
    }
    if (code !== undefined) {
      cy.enterMuiInput('Code', code);
    }
    if (name !== undefined) {
      cy.enterMuiInput('Name', name);
    }
    // undefined → select first available; null → skip (e.g. duplicate-code test); string → select that rule
    if (calculationRule !== null) {
      if (calculationRule) {
        cy.chooseMuiSelect('Calculation Rule', calculationRule);
      } else {
        cy.chooseFirstMuiSelect('Calculation Rule');
      }
    }
    // Prefer searching by program code: the 8-char unique code is reliably
    // matched by the BenefitPlanPicker server-side OR-search and avoids
    // ambiguity if the program name was mangled during program creation.
    if (benefitPlanCode) {
      cy.chooseMuiAutocomplete('Program', benefitPlanCode);
    } else if (benefitPlanName) {
      cy.chooseMuiAutocomplete('Program', benefitPlanName);
    }
    if (dateValidFrom) {
      cy.enterDateInput('Valid from', dateValidFrom);
    }
    if (dateValidTo) {
      cy.enterDateInput('Valid to', dateValidTo);
    }
    if (calculationParams) {
      fillCalculationParams(calculationParams);
    }
    if (advancedCriteria) {
      const criteriaList = Array.isArray(advancedCriteria) ? advancedCriteria : [advancedCriteria];
      // Add ALL rows first, then fill each one by stable index position.
      criteriaList.forEach(() => cy.contains('button', 'Add criterion').click());
      criteriaList.forEach((criterion, index) => fillCriterionRow(index, criterion));
      cy.contains('button', 'Confirm Criteria').click();
    }
  });

  Cypress.Commands.add('savePaymentPlan', (mutationLabel = null) => {
    cy.saveAndAwaitJournal({ saveTitle: 'Save changes', mutationLabel });
  });

  Cypress.Commands.add('createPaymentPlan', ({
    type = 'Benefit Plan',
    code,
    name,
    calculationRule,
    calculationParams,
    benefitPlanCode,
    benefitPlanName,
    dateValidFrom,
    dateValidTo,
    advancedCriteria,
  }) => {
    cy.openCreatePaymentPlan();
    cy.fillPaymentPlanForm({
      type,
      code,
      name,
      calculationRule,
      calculationParams,
      benefitPlanCode,
      benefitPlanName,
      dateValidFrom,
      dateValidTo,
      advancedCriteria,
    });
    cy.savePaymentPlan('Create Payment Plan');
    cy.assertJournalNoFail('Failed to create');
  });

  Cypress.Commands.add('filterPaymentPlans', ({
    code,
    name,
    dateValidFrom,
    dateValidTo,
    showDeleted = false,
    showHistory = false,
  } = {}) => {
    // (limitation) No filter for benefit plan — the UI doesn't expose one.
    cy.visit('/front/paymentPlans');
    cy.contains('Payment Plans Found');

    if (code !== undefined) {
      cy.enterMuiInput('Code', code);
    }
    if (name !== undefined) {
      cy.enterMuiInput('Name', name);
    }
    if (dateValidFrom) {
      cy.enterDateInput('Valid from', dateValidFrom);
    }
    if (dateValidTo) {
      cy.enterDateInput('Valid to', dateValidTo);
    }
    if (showDeleted) {
      cy.toggleMuiCheckbox('isDeleted', true);
    }
    if (showHistory) {
      cy.toggleMuiCheckbox('showHistory', true);
    }

    cy.aliasGraphqlQuery('paymentPlan(', 'paymentPlanSearch');
    cy.contains('button', 'Search').click();
    cy.awaitSearcherRefresh('paymentPlanSearch', /Payment Plans Found/);
  });

  Cypress.Commands.add('resetPaymentPlanFilters', () => {
    cy.aliasGraphqlQuery('paymentPlan(', 'paymentPlanReset');
    cy.resetSearcherFilters(/Payment Plans Found/, 'paymentPlanReset');
  });

  Cypress.Commands.add('assertPaymentPlanRowVisible', ({ code, name }) => {
    cy.assertTableRowVisible([code, name]);
  });

  Cypress.Commands.add('assertPaymentPlanRowNotVisible', ({ code, name }) => {
    cy.assertTableRowNotVisible([code, name]);
  });

  Cypress.Commands.add('openPaymentPlanForEditFromList', (nameOrCode) => {
    cy.filterPaymentPlans({ code: nameOrCode });
    // Edit is rendered as an <a> (IconButton with href), not a <button>.
    cy.openRowAction(nameOrCode, 'Edit', { tag: 'a' });
    cy.contains('General Information');
  });

  Cypress.Commands.add('replacePaymentPlanFromList', (nameOrCode) => {
    cy.filterPaymentPlans({ code: nameOrCode });
    cy.openRowAction(nameOrCode, 'Add New Version');
    cy.contains('General Information');
  });

  Cypress.Commands.add('deletePaymentPlan', (nameOrCode, options = {}) => {
    cy.filterPaymentPlans({
      code: options.useCodeFilter ? nameOrCode : undefined,
      name: options.useCodeFilter ? undefined : nameOrCode,
      showDeleted: options.showDeleted,
      showHistory: options.showHistory,
    });

    cy.openRowActionIfPresent(nameOrCode, 'Delete').then((found) => {
      if (!found) {
        Cypress.log({
          name: 'deletePaymentPlan',
          message: `No payment plan found matching "${nameOrCode}"`,
        });
        return;
      }

      cy.contains('button', 'Ok').click();
      cy.waitForJournalProgress();
      cy.assertJournalFirstEntryContains('Delete Payment Plan');
    });
  });
}
