
// =====================================================
// 🔹 NAVIGATION HELPERS
// =====================================================
export function goToInsureesPage() {
  cy.get('[data-cy="InsureeMainMenu"]').click();
  cy.get('[href="/front/insuree/insurees"]').click();
}

export function fillHeadInsureeChfId(familyChfId) {
  cy.get('[data-cy="head-insuree-chf-id-filter"]')
    .find('input')
    .first()
    .clear()
    .type(familyChfId)
    .blur();
}

export function goToFamilyForm(familyChfId) {
  if (!!familyChfId) {
    cy.goToFamiliesPage();
    cy.verifyFamilyExists({ chfId: familyChfId });
    cy.selectSearcherRow(familyChfId);
    return;
  }
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

export function addExistingInsureeIntoFamily(insureeChfId, familyChfId) {
  cy.goToFamilyForm(familyChfId);
  cy.get('[data-cy="family-add-existing-insuree-button"]').click();
  cy.get('[data-cy="insuree-chf-id-picker"] input').clear().type(insureeChfId)
  cy.get('td')
    .find('div')
    .filter((index, div) => {
      const input = div.querySelector('input[type="text"]');
      return input && input.value.includes(insureeChfId);
    })
    .first()
    .rightclick();

  cy.get('[data-cy="change-insuree-family-dialog-cancel-policies-button"]').click();
}

export function removeExistingInsureeFromFamily(insureeChfId, familyChfId) {
  cy.goToFamilyForm(familyChfId);
  cy.get('[data-cy="family-insuree-seacher-open-button"]').click();
  cy.get('[data-cy="family-insurees-search-chfId"] input').clear().type(insureeChfId)
  cy.get('[data-cy="family-remove-insuree-button"]').click();
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
  cy.get('[data-cy="insuree-chf-id-input"] input').clear().type(chfId);
  cy.get('[data-cy="insuree-other-names-input"] input').clear().type(firstName);
  cy.get('[data-cy="insuree-last-name-input"] input').clear().type(lastName);

  // Date of Birth
  cy.get('button[type="button"] > svg[data-testid="CalendarIcon"]')
    .first()
    .parent()
    .click();
  cy.get('[data-cy="insuree-dob-day"]').contains(dobDay).click();

  // Gender
  cy.get('[data-cy="insuree-gender-picker"]').click();
  cy.get(`[data-value='\"${gender}\"']`).click();

  // Contacts
  cy.get('[data-cy="insuree-phone-input"] input').clear().type(phone);
  cy.get('[data-cy="insuree-email-input"] input').clear().type(email);
  cy.get('[data-cy="insuree-passport-input"] input').clear().type(passport);

  // Pickers
  cy.get('[data-cy="insuree-profession-picker"]').click();
  cy.get(`[data-value="${profession}"]`).click();
  cy.get('[data-cy="insuree-education-picker"]').click();
  cy.get(`[data-value="${education}"]`).click();
  cy.get('[data-cy="insuree-type-of-id-picker"]').click();
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
  cy.get('[data-cy="family-type-picker"]').click();
  cy.get(`[data-value='\"${familyType}\"']`).click();

  // Confirmation Type
  cy.get('[data-cy="family-confirmation-type-picker"]').click();
  cy.get('[role="option"]').eq(confirmationTypeIndex).click();

  // Confirmation No
  cy.get('[data-cy="family-confirmation-no-input"] input').clear().type(confirmationNo);

  // Address
  cy.get('[data-cy="family-address-textarea"]').find('textarea').first()
    .clear()
    .type(address);
}

export function goToFamilyOverview(family) {
  cy.goToFamiliesPage();
  cy.verifyFamilyExists(family);
  cy.selectSearcherRow(family.lastName);
}

export function selectSearcherRow(data) {
  cy.contains(data).parents('tr, div').first().dblclick();
}

// =====================================================
// 🔹 ASSERTION HELPERS DYNAMIQUES
// =====================================================
export function verifyInsureeExists({
  chfId = '692651197',
  firstName = 'Paul', //This field removes the second character from the string entered by Cypress.
  lastName = 'Sandjong',
  phone = '602000000'
} = {}) {
  goToInsureesPage();

  cy.get('[data-cy="insuree-chf-id-filter"] input').clear().type(chfId);
  cy.scrollTo('right');
  cy.get('[data-cy="searcher-refresh"]').click({ force: true });

  cy.contains(lastName);
  cy.contains(chfId);
  cy.contains(phone);
}

export function verifyFamilyExists({
  lastName = 'Chineze',
  firstName = 'Sylvie', //This field removes the second character from the string entered by Cypress.
  chfId = '697547030',
  phone = '602000000'
} = {}) {
  goToFamiliesPage();

  fillHeadInsureeChfId(chfId);

  cy.scrollTo('right');
  cy.get('[data-cy="searcher-refresh"]').scrollIntoView();
  cy.get('[data-cy="searcher-refresh"]').click({ force: true });

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
    cy.selectSearcherRow('Sandjong');

    cy.get('button[type="button"] > svg[data-testid="CalendarIcon"]')
      .first()
      .parent()
      .click();
    cy.get('[data-cy="insuree-dob-day"]').contains('18').click();
    clickSave();

    // ------------------ MODIFY FAMILY ------------------
    cy.verifyFamilyExists({ chfId: '697547030' });
    cy.selectSearcherRow('Chineze');

    cy.get('[data-cy="family-confirmation-no-input"] input').clear().type('CONF-002');
    clickSave();

    // ------------------ ADD EXISTING INSUREE INTO FAMILY ------------------
    cy.addExistingInsureeIntoFamily('692651197', '697547030');

    // ------------------ REMOVE EXISTING INSUREE FROM FAMILY ------------------
    cy.removeExistingInsureeFromFamily('692651197', '697547030');

    // ------------------ DELETE INSUREE ------------------
    verifyInsureeExists({ chfId: '692651197' });
    cy.get('[data-cy="delete-insuree-button"]').first().click({force: true});
    cy.get('[data-cy="dialog-confirm-button"]').click({ force: true });

    // ------------------ DELETE FAMILY ------------------
    cy.verifyFamilyExists({ chfId: '697547030' });
    cy.get('[data-cy="delete-family-button"]').first().click({ force: true });
    cy.get('[data-cy="delete-family-and-insurees-button"]').click({ force: true });

  });
});

