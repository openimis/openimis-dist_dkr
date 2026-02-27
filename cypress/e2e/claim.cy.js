// Test data
export const claim = {
  insureeChfId: '070707055',
  visitType: 'O',
  careType: 'IPD',
  diagnosis: 'A009',
  code: 'CLM001',
  explanation: 'Test claim from Cypress',
  claimPatientCondition: 'H',
  admin: 'Admin Admin',
  hFCode: 'JMHOS001',
  services: [{ code: 'I117' }, { code: 'I125' }],
  items: [{ code: '0002' }, { code: '0011' }]
};

const Claim = {

  goToList: () => {
    cy.contains('Claims').click();
    cy.contains('a', 'Health Facility Claims').click();
  },

  goToForm: (claim, admin) => {
    if (!claim && !admin) {
      throw new Error('Claim or Admin is required');
    }
    Claim.goToList();

    if (admin) {
        cy.chooseMuiSelect('Claim Administrator', admin);
        cy.get('[aria-label="Create new claim"]').click();
        return;
    }

    cy.enterMuiInput('Claim No.', claim.code, "input");
    cy.contains('button', 'Search').click({force: true});
    cy.openRow(claim.code);
  },

  fillForm: (claim) => {

    cy.enterMuiInput('Insurance No.', claim.insureeChfId, "input");

    cy.chooseMuiDatePicker('Visit Date From', '10');
    cy.chooseMuiDatePicker('Visit Date To', '15');

    cy.chooseMuiSelect('In/out-patient', claim.visitType);

    cy.chooseMuiSelect('Main Diagnosis', claim.diagnosis);

    cy.enterMuiInput('Claim No.', claim.code);

    cy.enterMuiInput('Explanation', claim.explanation);

    cy.chooseMuiSelect("Patient's condition at discharge", claim.claimPatientCondition);
    
    Claim.addServices(claim.services);
    Claim.addItems(claim.items);

  },

  addServices: (services) => {
    services.forEach(service => {
        cy.get('input[placeholder*="Search Service"]')
          .last()
          .type(service.code);
      cy.get('body')
        .contains('li[role="option"]', service.code, { timeout: 10000 })
        .should('be.visible')
        .click({ force: true });
    });
  },

  addItems: (items) => {
    items.forEach(item => {
        cy.get('input[placeholder*="Search Item"]')
          .last()
          .type(item.code);
      cy.get('body')
        .contains('li[role="option"]', item.code, { timeout: 10000 })
        .should('be.visible')
        .click({ force: true });
    });
  },

  verifyExists: (claim) => {
    Claim.goToList();
    cy.enterMuiInput('Claim No.', claim.code, "input");
    cy.contains('button', 'Search').click();
    cy.contains(claim.code);
    cy.contains(claim.hFCode);
  },

  updateExplanation: (claim, newText) => {
    Claim.goToForm(claim);
    cy.enterMuiInput('Explanation', newText);
    cy.save();
  },

  open: (claim) => {
    Claim.goToList();
    cy.enterMuiInput('Claim No.', claim.code, "input");
    cy.contains('button', 'Search').click({force: true});

    cy.contains('tr', claim.code)
      .within(() => {
        cy.contains('button', 'Open').click();
      });
  }

};

// Tests
describe('Claim Workflow', () => {

  it('should execute complete claim flow cleanly', () => {

    cy.login();

    // Create new claim
    Claim.goToForm(null, claim.admin);
    Claim.fillForm(claim);
    cy.save();
    Claim.verifyExists(claim);

    // Update claim
    Claim.updateExplanation(claim, 'Updated Explanation');

    // Open claim
    Claim.open(claim);

  });

});