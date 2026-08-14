// Test data
const claim = {
  insureeChfId: '070707055',
  visitType: 'O',
  careType: 'IPD',
  diagnosis: 'A009',
  code: `CLM${Date.now()}`,
  explanation: 'Test claim from Cypress',
  claimPatientCondition: 'H',
  admin: 'Admin Admin',
  hFCode: 'JMHOS001',
  visitDateFrom: { day: '10', month: '02', year: '2026' },
  visitDateTo: { day: '15', month: '02', year: '2026' },
  services: [{ code: 'I117' }, { code: 'I125' }],
  items: [{ code: '0002' }, { code: '0011' }],
};

// Navigation
const goToClaimList = () => {
  cy.contains('Claims').click();
  cy.contains('a', 'Health Facility Claims').click();
};

const goToExistingClaimForm = (claim) => {
  goToClaimList();
  cy.enterMuiInput('Claim No.', claim.code, 'input');
  cy.contains('button', 'Search').click({ force: true });
  cy.openRowByValue(claim.code);
};

const goToNewClaimForm = (admin) => {
  goToClaimList();
  cy.chooseMuiSelect('Claim Administrator', admin);
  cy.get('[aria-label="Create new claim"]').click();
};

// Form
const fillClaimForm = (claim) => {
  cy.enterMuiInput('Insurance No.', claim.insureeChfId, 'input');

  cy.chooseMuiDatePicker('Visit Date From', claim.visitDateFrom);
  cy.chooseMuiDatePicker('Visit Date To', claim.visitDateTo);

  cy.chooseMuiSelect('In/out-patient', claim.visitType);
  cy.chooseMuiSelect('Main Diagnosis', claim.diagnosis);

  cy.enterMuiInput('Claim No.', claim.code);
  cy.enterMuiInput('Explanation', claim.explanation);

  cy.chooseMuiSelect("Patient's condition at discharge", claim.claimPatientCondition);

  addServices(claim.services);
  addItems(claim.items);
};

// Helpers
const addServices = (services) => {
  services.forEach((service) => {
    cy.get('input[placeholder*="Search Service"]')
      .last()
      .type(service.code);

    cy.get('body')
      .contains('li[role="option"]', service.code, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });
  });
};

const addItems = (items) => {
  items.forEach((item) => {
    cy.get('input[placeholder*="Search Item"]')
      .last()
      .type(item.code);

    cy.get('body')
      .contains('li[role="option"]', item.code, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });
  });
};

// Actions
const formatDate = ({ day, month, year }) => {
  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');
  return `${d}-${m}-${year}`;
};

const verifyClaimDetails = (claim, updatedData = null) => {
  claim = updatedData ? { ...claim, ...updatedData } : claim;

  openClaim(claim);

  cy.verifyMuiInputValue('Insurance No.', claim.insureeChfId);
  cy.verifyMuiSelectValue('In/out-patient', claim.visitType);
  cy.verifyMuiSelectValue('Main Diagnosis', claim.diagnosis);
  cy.verifyMuiInputValue('Claim No.', claim.code);
  cy.verifyMuiInputValue('Explanation', claim.explanation);
  cy.verifyMuiSelectValue(
    "Patient's condition at discharge",
    claim.claimPatientCondition
  );

  cy.verifyMuiDatePickerValue(
    'Visit Date From',
    formatDate(claim.visitDateFrom)
  );
  cy.verifyMuiDatePickerValue(
    'Visit Date To',
    formatDate(claim.visitDateTo)
  );

  claim.services.forEach((service) => {
    cy.contains(service.code).should('exist');
  });

  claim.items.forEach((item) => {
    cy.contains(item.code).should('exist');
  });
};

const updateClaimExplanation = (claim, newText) => {
  goToExistingClaimForm(claim);
  cy.enterMuiInput('Explanation', newText);
  cy.save();
};

const openClaim = (claim) => {
  goToClaimList();
  cy.enterMuiInput('Claim No.', claim.code, 'input');
  cy.contains('button', 'Search').click({ force: true });

  cy.contains('tr', claim.code)
    .within(() => {
      cy.contains('button', 'Open').click();
    });
};

// Tests
describe('Claim Workflow', () => {
  it('should execute complete claim flow cleanly', () => {
    cy.login();

    // Create
    goToNewClaimForm(claim.admin);
    fillClaimForm(claim);
    cy.save();
    verifyClaimDetails(claim);

    // Update
    updateClaimExplanation(claim, 'Updated Explanation');
    verifyClaimDetails(claim, { explanation: 'Updated Explanation' });
  });
});