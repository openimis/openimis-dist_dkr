
// =====================================================
// 🔹 NAVIGATION HELPERS
// =====================================================
export function goToInsureesPage() {
  cy.get('[data-cy="InsureeMainMenu"]').click();
  cy.get('[href="/front/insuree/insurees"]').click();
}

export function goToFamilyForm() {
  cy.get('[data-cy="InsureeMainMenu"]').click();
  cy.get('[href="/front/insuree/family"]').click();
}

export function goToFamiliesPage() {
  cy.get('[data-cy="InsureeMainMenu"]').click();
  cy.get('[href="/front/insuree/families"]').click();
}

export function clickCreateInsuree() {
  cy.get('[data-cy="create-insuree-button"]').click();
}

export function clickSave() {
  cy.get("button[data-cy='save-button']").click();
}

// =====================================================
// 🔹 FORM HELPERS (DYNAMIQUES)
// =====================================================
export function fillInsureeForm({
  chfId = '123456',
  firstName = 'Paul',
  lastName = 'Sandjong',
  dobDay = '15',
  gender = 'M',
  phone = '602000000',
  email = 'cypress@example.com',
  passport = 'AB1234567',
  profession = '2',
  education = '2',
  typeOfId = 'D'
} = {}) {
  cy.get('[data-cy="insuree-chf-id"] input').clear().type(chfId);
  cy.get('[data-cy="insuree-other-names"] input').clear().type(firstName);
  cy.get('[data-cy="insuree-last-name"] input').clear().type(lastName);

  // Date of Birth
  cy.get('button[type="button"] > svg[data-testid="CalendarIcon"]')
    .first()
    .parent()
    .click();
  cy.get('[data-cy="insuree-dob-day"]').contains(dobDay).click();

  // Gender
  cy.get('[data-cy="insuree-gender"]').click();
  cy.get(`[data-value='\"${gender}\"']`).click();

  // Contacts
  cy.get('[data-cy="insuree-phone"] input').clear().type(phone);
  cy.get('[data-cy="insuree-email"] input').clear().type(email);
  cy.get('[data-cy="insuree-passport"] input').clear().type(passport);

  // Pickers
  cy.get('[data-cy="insuree-profession"]').click();
  cy.get(`[data-value="${profession}"]`).click();
  cy.get('[data-cy="insuree-education"]').click();
  cy.get(`[data-value="${education}"]`).click();
  cy.get('[data-cy="insuree-type-of-id"]').click();
  cy.get(`[data-value='\"${typeOfId}\"']`).click();
}

export function fillFamilyForm({
  location = 'R1D1M1V1',
  familyType = 'H',
  confirmationTypeIndex = 0,
  confirmationNo = 'CONF-001',
  address = 'Douala, Cameroun'
} = {}) {
  // Location Village : choosing village fill all others locations
  cy.get('[data-cy="location-V-picker"]')
    .find('input')
    .first()
    .click()
    .type(location);
  cy.get('[role="listbox"]').should('be.visible')
    .find('[role="option"]').first().click();

  // Family Type
  cy.get('[data-cy="family-type"]').click();
  cy.get(`[data-value='\"${familyType}\"']`).click();

  // Confirmation Type
  cy.get('[data-cy="family-confirmation-type"]').click();
  cy.get('[role="option"]').eq(confirmationTypeIndex).click();

  // Confirmation No
  cy.get('[data-cy="family-confirmation-no"] input').clear().type(confirmationNo);

  // Address
  cy.get('[data-cy="family-address"]').find('textarea').first()
    .clear()
    .type(address);
}

// =====================================================
// 🔹 ASSERTION HELPERS DYNAMIQUES
// =====================================================
export function verifyInsureeExists({
  chfId = '692651197',
  firstName = 'Paul',
  lastName = 'Sandjong',
  phone = '602000000'
} = {}) {
  goToInsureesPage();

  cy.get('[data-cy="insuree-chf-id"] input').clear().type(chfId);
  cy.scrollTo('right');
  cy.get('[data-cy="searcher-refresh"]').click();

  cy.contains(lastName);
  cy.contains(chfId);
  cy.contains(phone);
}

export function verifyFamilyExists({
  confirmationNo = 'CONF-001',
  lastName = 'Chineze',
  firstName = 'Sylvie',
  chfId = '697547030',
  phone = '602000000'
} = {}) {
  goToFamiliesPage();

  cy.get('[data-cy="head-insuree-chf-id"]')
    .find('input')
    .first()
    .clear()
    .type(chfId);

  cy.scrollTo('right');
  cy.get('[data-cy="searcher-refresh"]').click();

  cy.contains(lastName);
  cy.contains(chfId);
  cy.contains(phone);
}

// =====================================================
// 🔹 TESTS DYNAMIQUES
// =====================================================
describe('Full Family & Insuree Workflow', () => {
  it('Should run the entire flow in one test', () => {
    // ------------------ LOGIN ------------------
    cy.login();

    // ------------------ CREATE INSUREE ------------------
    cy.goToInsureesPage();
    clickCreateInsuree();
    cy.fillInsureeForm({
      chfId: '692651197',
      firstName: 'Paul',
      lastName: 'Sandjong',
      phone: '602000000'
    });
    clickSave();

    verifyInsureeExists({
      chfId: '692651197',
      firstName: 'Paul',
      lastName: 'Sandjong',
      phone: '602000000'
    });

    // ------------------ CREATE FAMILY ------------------
    cy.goToFamilyForm();
    cy.fillFamilyForm({
      confirmationNo: 'CONF-001',
      address: 'Douala, Cameroun'
    });
    cy.fillInsureeForm({
      chfId: '697547030',
      firstName: 'Sylvie',
      lastName: 'Chineze',
      gender: 'F'
    });
    clickSave();

    verifyFamilyExists({
      confirmationNo: 'CONF-001',
      lastName: 'Chineze',
      firstName: 'Sylvie',
      chfId: '697547030'
    });

    // ------------------ MODIFY INSUREE ------------------
    verifyInsureeExists({ chfId: '692651197' });
    cy.contains('Sandjong').parents('tr, div').first().dblclick();

    cy.get('button[type="button"] > svg[data-testid="CalendarIcon"]')
      .first()
      .parent()
      .click();
    cy.get('[data-cy="insuree-dob-day"]').contains('18').click();
    clickSave();

    // ------------------ MODIFY FAMILY ------------------
    cy.verifyFamilyExists({ chfId: '697547030' });
    cy.contains('697547030').parents('tr, div').first().dblclick();

    cy.get('[data-cy="family-confirmation-no"] input').clear().type('CONF-002');
    clickSave();

    // ------------------ DELETE FAMILY ------------------
    cy.verifyFamilyExists({ chfId: '697547030' });
    cy.wait(1000);
    cy.get('[data-cy="delete-family-button"]').first().click();
    cy.get('[data-cy="dialog-confirm-button"]').click();

    // ------------------ DELETE INSUREE ------------------
    verifyInsureeExists({ chfId: '692651197' });
    cy.wait(1000);
    cy.get('[data-cy="delete-insuree-button"]').first().click();
    cy.get('[data-cy="dialog-confirm-button"]').click();
  });
});

