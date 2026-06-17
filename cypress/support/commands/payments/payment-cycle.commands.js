import { TIMEOUTS } from '../../constants';

export function registerPaymentCycleCommands() {
  Cypress.Commands.add('assertPaymentCycleDetailFields', ({
    code,
    startDate,
    status,
    endDate,
  }) => {
    cy.assertMuiInput('Code', code);
    cy.assertMuiInput('Start Date', startDate);
    cy.assertMuiInput('End Date', endDate);
    cy.assertMuiSelectValue('Status', status);
  });

  Cypress.Commands.add('openCreatePaymentCycle', () => {
    cy.visit('/front/paymentCycles');
    cy.contains('Payment Cycles Found');

    cy.clickCreate();
    cy.contains('General Information');
  });

  Cypress.Commands.add('fillPaymentCycleForm', ({
    code,
    startDate,
    endDate,
    status,
  }) => {
    if (code !== undefined) {
      cy.enterMuiInput('Code', code);
    }
    if (startDate) {
      cy.enterDateInput('Start Date', startDate);
    }
    if (endDate) {
      cy.enterDateInput('End Date', endDate);
    }
    if (status) {
      cy.chooseMuiSelect('Status', status);
    }
  });

  // savePaymentCycle branches on the form's current Status to choose the
  // expected post-save UX:
  //
  // 1. Direct creation (PENDING, SUSPENDED): the server redirects to
  //    /paymentCycle/{UUID}.
  //
  // 2. Task workflow (ACTIVE): a
  //    notification dialog appears which must be dismissed.  The caller is
  //    responsible for approving the resulting task via
  //    `cy.approveLatestPaymentCycleTask()` before the cycle becomes ACTIVE.
  //
  // Reading the Status select up front keeps this helper deterministic and
  // avoids fragile DOM race conditions right after the save click.
  Cypress.Commands.add('savePaymentCycle', () => {
    cy.contains('label', 'Status')
      .siblings('.MuiInputBase-root')
      .find('[role="button"]')
      .invoke('text')
      .then((statusText) => {
        const expectDialog = statusText.trim().toUpperCase() === 'ACTIVE';
        cy.log(`savePaymentCycle: status="${statusText.trim()}" → expectDialog=${expectDialog}`);

        cy.clickSave();

        if (expectDialog) {
          cy.get('[role="dialog"]', { timeout: TIMEOUTS.BACKEND_VALIDATION })
            .should('be.visible');
          cy.get('[role="dialog"] .MuiDialogActions-root button').first().click();
          cy.url().should('include', '/paymentCycles');
        } else {
          cy.url({ timeout: TIMEOUTS.BACKEND_VALIDATION })
            .should('match', /\/paymentCycle\/[^/]+/);
        }
      });
  });

  Cypress.Commands.add('createPaymentCycle', ({
    code,
    startDate,
    endDate,
    status = 'PENDING',
  }) => {
    cy.openCreatePaymentCycle();
    cy.fillPaymentCycleForm({
      code,
      startDate,
      endDate,
      status,
    });
    cy.savePaymentCycle();
  });

  Cypress.Commands.add('filterPaymentCycles', ({
    code,
    status,
    dateFrom,
    dateTo,
  } = {}) => {
    cy.visit('/front/paymentCycles');
    cy.contains('Payment Cycles Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);

    if (code !== undefined) {
      cy.enterMuiInput('Code', code);
    }
    if (status !== undefined) {
      cy.chooseMuiSelect('Status', status);
    }
    // Searcher filter labels are "Date From" / "Date To" (translation
    // `paymentCycle.label.dateValidFrom` / `dateValidTo`) — distinct from
    // the create-form labels "Start Date" / "End Date".
    if (dateFrom) {
      cy.enterDateInput('Date From', dateFrom);
    }
    if (dateTo) {
      cy.enterDateInput('Date To', dateTo);
    }

    cy.aliasGraphqlQuery('paymentCycle(', 'paymentCycleSearch');
    cy.contains('button', 'Search').click();
    cy.awaitSearcherRefresh('paymentCycleSearch', 'Payment Cycles Found');
  });

  Cypress.Commands.add('assertPaymentCycleRowVisible', ({ code, status }) => {
    cy.contains('table tbody tr', code, { timeout: TIMEOUTS.BACKEND_VALIDATION })
      .should('exist')
      .within(() => {
        if (status) {
          // The Status column renders a read-only PaymentCycleStatusPicker
          // (label "Payment Cycle Status") as an <input value="PENDING">.
          // cy.contains matches element text, not input values, so assert the
          // value across the row's inputs instead.
          cy.get('input').then(($inputs) => {
            const values = [...$inputs].map((i) => i.value);
            expect(values, `status for cycle ${code}`).to.include(status);
          });
        }
      });
  });

  Cypress.Commands.add('assertPaymentCycleRowNotVisible', ({ code }) => {
    cy.assertTableRowNotVisible([code]);
  });

  Cypress.Commands.add('resetPaymentCycleFilters', () => {
    cy.aliasGraphqlQuery('paymentCycle(', 'paymentCycleReset');
    cy.resetSearcherFilters('Payment Cycles Found', 'paymentCycleReset');
  });

  Cypress.Commands.add('openPaymentCycleForViewFromList', (code) => {
    cy.filterPaymentCycles({ code });
    // Row has a single action: View Details (Eye icon).
    cy.contains('table tbody tr', code)
      .should('exist')
      .within(() => {
        cy.get('button.MuiIconButton-root').click({ force: true });
      });
    cy.contains('General Information');
  });
}
