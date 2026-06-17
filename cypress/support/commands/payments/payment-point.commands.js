import { TIMEOUTS } from '../../constants';

export function registerPaymentPointCommands() {
  Cypress.Commands.add('assertPaymentPointDetailFields', ({ name, ppm }) => {
    cy.assertMuiInput('Name', name);
    if (ppm) {
      cy.assertMuiAutoComplete('Payment Point Manager', ppm);
    }
  });

  Cypress.Commands.add('openCreatePaymentPoint', () => {
    cy.visit('/front/paymentPoints');
    cy.contains('Payment Points Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });
    cy.clickCreate();
    cy.url().should('include', '/paymentPoints/paymentPoint');
  });

  Cypress.Commands.add('fillPaymentPointForm', ({
    name,
    region,
    district,
    municipality,
    village,
    ppm,
  }) => {
    cy.chooseLocation({ region, district, municipality, village });
    if (ppm) {
      cy.chooseMuiAutocomplete('Payment Point Manager', ppm);
    }
    if (name !== undefined) {
      cy.enterMuiInput('Name', name);
    }
  });

  Cypress.Commands.add('savePaymentPoint', () => {
    cy.clickSave();
    cy.contains('Payment Points Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });
  });

  Cypress.Commands.add('createPaymentPoint', (data) => {
    cy.openCreatePaymentPoint();
    cy.fillPaymentPointForm(data);
    cy.savePaymentPoint();
  });

  Cypress.Commands.add('filterPaymentPoints', ({
    name,
    ppm,
    region,
    district,
    municipality,
    village,
    showDeleted = false,
  } = {}) => {
    cy.visit('/front/paymentPoints');
    cy.contains('Payment Points Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });

    cy.chooseLocation({ region, district, municipality, village });
    if (ppm) {
      cy.chooseMuiAutocomplete('Payment Point Manager', ppm);
    }
    if (name !== undefined) {
      cy.enterMuiInput('Name', name);
    }
    if (showDeleted) {
      cy.toggleMuiCheckbox('Show Deleted', true);
    }

    cy.aliasGraphqlQuery('paymentPoint(', 'paymentPointSearch');
    cy.contains('button', 'Search').click();
    cy.awaitSearcherRefresh('paymentPointSearch', 'Payment Points Found');
  });

  Cypress.Commands.add('assertPaymentPointRowVisible', ({ name }) => {
    cy.assertTableRowVisible([name]);
  });

  Cypress.Commands.add('assertPaymentPointRowNotVisible', ({ name }) => {
    cy.assertTableRowNotVisible([name]);
  });

  // Payment-point row actions render as bare IconButtons without a [title]
  // tooltip wrapper, so openRowAction/openRowActionIfPresent cannot match.
  // Rows have exactly two IconButtons: View (first/eye) and Delete (last/trash).
  Cypress.Commands.add('openPaymentPointForViewFromList', (name) => {
    cy.filterPaymentPoints({ name });
    cy.contains('table tbody tr', name)
      .should('exist')
      .within(() => {
        cy.get('button.MuiIconButton-root').first().click({ force: true });
      });
    cy.url({ timeout: TIMEOUTS.BACKEND_VALIDATION }).should('include', '/paymentPoints/paymentPoint');
  });

  Cypress.Commands.add('deletePaymentPointFromList', (name) => {
    cy.filterPaymentPoints({ name });
    cy.get('body').then(($body) => {
      const row = $body.find('table tbody tr').toArray()
        .find((tr) => tr.innerText.includes(name));

      if (!row) {
        Cypress.log({
          name: 'deletePaymentPointFromList',
          message: `No payment point found matching "${name}"`,
        });
        return;
      }

      cy.wrap(row).within(() => {
        cy.get('button.MuiIconButton-root').last().click({ force: true });
      });
      cy.contains('button', 'Ok').click();
      cy.url().should('include', '/paymentPoints');
    });
  });

  Cypress.Commands.add('resetPaymentPointFilters', () => {
    cy.aliasGraphqlQuery('paymentPoint(', 'paymentPointReset');
    cy.resetSearcherFilters('Payment Points Found', 'paymentPointReset');
  });
}
