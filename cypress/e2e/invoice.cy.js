import { invoicePage } from '../support/pages/InvoicePage';

describe('Invoice payment workflow', () => {
  let data;

  before(() => {
    cy.fixture('invoicePayment').then((fixture) => {
      data = fixture;
    });
  });

  beforeEach(() => {
    cy.login();
  });

  afterEach(function () {
    // Clean data only if the test didn't failed
    if (this.currentTest.state === 'failed') return;
    invoicePage.deletePayment(data.family.head.chfId, data.payment, {
      failIfMissing: false,
    });
  });

  it('Create invoice payment', () => {

    //create family and give them policy
    invoicePage.createFamily(data.family);
    invoicePage.createPolicy(data.family.head.chfId, data.policy);

    // go to create invoice payment
    invoicePage.goToForm(data.family.head.chfId);
    invoicePage.fillForm(data.payment);

    // save payment
    cy.contains('[role="dialog"]', 'Create').within(() => {
      cy.contains('button', 'Create').click({ force: true });
    });
    cy.waitForGraphQL('createPayment');

    // check invoice payment
    invoicePage.verifyExists(data.family.head.chfId, data.payment);
  });
});