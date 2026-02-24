// =====================================================
// 🔹 CONSTANTS / TEST DATA
// =====================================================
export const insureeHead = {
  chfId: '697547030',
  firstName: 'Sylvie',
  lastName: 'Chineze',
  gender: 'F',
  phone: '602111111',
  email: 'sylvie@example.com',
  passport: 'AB7654321',
  profession: '2',
  education: '2',
  typeOfId: 'D',
  dobDay: '15'
};

export const insureeMember = {
  chfId: '692651197',
  firstName: 'Paul',
  lastName: 'Sandjong',
  gender: 'M',
  phone: '602000000',
  email: 'paul@example.com',
  passport: 'AB1234567',
  profession: '2',
  education: '2',
  typeOfId: 'D',
  dobDay: '18'
};

export const family = {
  location: 'R1D1M1V1',
  familyType: 'H',
  confirmationNo: 'CONF-001',
  address: 'Douala, Cameroun'
};

// =====================================================
// 🔹 NAVIGATION HELPERS
// =====================================================
export function goToInsureesPage() {
  cy.get('[data-cy="InsureeMainMenu"]').click();
  cy.get('[href="/front/insuree/insurees"]').click();
}

export function goToFamiliesPage() {
  cy.get('[data-cy="InsureeMainMenu"]').click();
  cy.get('[href="/front/insuree/families"]').click();
}

export function goToFamilyForm(familyChfId) {
  if (familyChfId) {
    goToFamiliesPage();
    verifyFamilyExists({ chfId: familyChfId });
    selectSearcherRow(familyChfId);
    return;
  }
  cy.get('[data-cy="InsureeMainMenu"]').click();
  cy.get('[href="/front/insuree/family"]').click();
}

// =====================================================
// 🔹 FORM HELPERS
// =====================================================
export function fillInsureeForm(insuree) {
  cy.get('[data-cy="insuree-chf-id-input"] input').clear().type(insuree.chfId);
  cy.get('[data-cy="insuree-other-names-input"] input').clear().type(insuree.firstName);
  cy.get('[data-cy="insuree-last-name-input"] input').clear().type(insuree.lastName);

  // Date of Birth
  cy.get('button[type="button"] > svg[data-testid="CalendarIcon"]')
    .first()
    .parent()
    .click();
  cy.get('[data-cy="insuree-dob-day"]').contains(insuree.dobDay).click();

  // Gender
  cy.get('[data-cy="insuree-gender-picker"]').click();
  cy.get(`[data-value='\"${insuree.gender}\"']`).click();

  // Contacts
  cy.get('[data-cy="insuree-phone-input"] input').clear().type(insuree.phone);
  cy.get('[data-cy="insuree-email-input"] input').clear().type(insuree.email);
  cy.get('[data-cy="insuree-passport-input"] input').clear().type(insuree.passport);

  // Pickers
  cy.get('[data-cy="insuree-profession-picker"]').click();
  cy.get(`[data-value="${insuree.profession}"]`).click();
  cy.get('[data-cy="insuree-education-picker"]').click();
  cy.get(`[data-value="${insuree.education}"]`).click();
  cy.get('[data-cy="insuree-type-of-id-picker"]').click();
  cy.get(`[data-value='\"${insuree.typeOfId}\"']`).click();
}

export function fillFamilyForm(familyData) {
  cy.get('[data-cy="location-V-picker"] input').first().click().type(familyData.location);
  cy.get('[role="listbox"]').should('be.visible').find('[role="option"]').first().click();

  cy.get('[data-cy="family-type-picker"]').click();
  cy.get(`[data-value='\"${familyData.familyType}\"']`).click();

  cy.get('[data-cy="family-confirmation-type-picker"]').click();
  cy.get('[role="option"]').eq(0).click(); // confirmation type index

  cy.get('[data-cy="family-confirmation-no-input"] input').clear().type(familyData.confirmationNo);

  cy.get('[data-cy="family-address-textarea"] textarea').clear().type(familyData.address);
}

// =====================================================
// 🔹 ACTION HELPERS
// =====================================================
export function clickCreateInsuree() {
  cy.get('[data-cy="create-insuree-button"]').click();
}

export function clickSave() {
  cy.get("button[data-cy='save-button']").click();
}

export function addExistingInsureeIntoFamily(member, head) {
  goToFamilyForm(head.chfId);
  cy.get('[data-cy="family-add-existing-insuree-button"]').click();
  cy.get('[data-cy="insuree-chf-id-picker"] input').clear().type(member.chfId);
  
  cy.get('td div').filter((index, div) => {
    const input = div.querySelector('input[type="text"]');
    return input && input.value.includes(member.chfId);
  }).first().rightclick();

  cy.get('[data-cy="change-insuree-family-dialog-cancel-policies-button"]').click();
}

export function removeExistingInsureeFromFamily(member, head) {
  goToFamilyForm(head.chfId);
  cy.get('[data-cy="family-insuree-seacher-open-button"]').click();
  cy.get('[data-cy="family-insurees-search-chfId"] input').clear().type(member.chfId);
  cy.get('[data-cy="family-remove-insuree-button"]').first().click();
  cy.get('[data-cy="remove-insuree-from-family-cancel-policies-btn"]').click();
}

export function selectSearcherRow(data) {
  cy.contains(data).parents('tr, div').first().dblclick();
}

// =====================================================
// 🔹 ASSERTION HELPERS
// =====================================================
export function verifyInsureeExists(insuree) {
  goToInsureesPage();
  cy.get('[data-cy="insuree-chf-id-filter"] input').clear().type(insuree.chfId);
  cy.scrollTo('right');
  cy.get('[data-cy="searcher-refresh"]').click({ force: true });
  cy.contains(insuree.lastName);
  cy.contains(insuree.chfId);
  cy.contains(insuree.phone);
}

export function verifyFamilyExists(head) {
  goToFamiliesPage();
  cy.get('[data-cy="head-insuree-chf-id-filter"] input').first().clear().type(head.chfId);
  cy.scrollTo('right');
  cy.get('[data-cy="searcher-refresh"]').scrollIntoView().click({ force: true });
  cy.contains(head.lastName);
  cy.contains(head.chfId);
  cy.contains(head.phone);
}

// =====================================================
// 🔹 TEST CASE
// =====================================================
describe('Full Family & Insuree Workflow', () => {
  it('Should run the full flow using variables', () => {
    // ------------------ LOGIN ------------------
    cy.login();

    // ------------------ CREATE INSUREE MEMBER ------------------
    cy.goToInsureesPage();
    clickCreateInsuree();
    fillInsureeForm(insureeMember);
    clickSave();
    verifyInsureeExists(insureeMember);

    // ------------------ CREATE FAMILY WITH HEAD INSUREE ------------------
    goToFamilyForm();
    fillFamilyForm(family);
    fillInsureeForm(insureeHead); // chef de famille
    clickSave();
    verifyFamilyExists({ ...insureeHead, confirmationNo: family.confirmationNo });

    // ------------------ MODIFY INSUREE MEMBER ------------------
    verifyInsureeExists(insureeMember);
    selectSearcherRow(insureeMember.lastName);

    cy.get('button[type="button"] > svg[data-testid="CalendarIcon"]')
      .first()
      .parent()
      .click();
    cy.get('[data-cy="insuree-dob-day"]').contains(insureeMember.dobDay).click();
    clickSave();

    // ------------------ MODIFY FAMILY ------------------
    verifyFamilyExists(insureeHead);
    selectSearcherRow(insureeHead.lastName);

    cy.get('[data-cy="family-confirmation-no-input"] input')
      .clear()
      .type('CONF-002');
    clickSave();

    // ------------------ ADD MEMBER TO FAMILY ------------------
    addExistingInsureeIntoFamily(insureeMember, insureeHead);

    // ------------------ REMOVE MEMBER FROM FAMILY ------------------
    removeExistingInsureeFromFamily(insureeMember, insureeHead);

    // ------------------ DELETE INSUREE MEMBER ------------------
    verifyInsureeExists(insureeMember);
    cy.get('[data-cy="delete-insuree-button"]').first().click({ force: true });
    cy.get('[data-cy="dialog-confirm-button"]').click({ force: true });

    // ------------------ DELETE FAMILY ------------------
    verifyFamilyExists(insureeHead);
    cy.get('[data-cy="delete-family-button"]').first().click({ force: true });
    cy.get('[data-cy="delete-family-and-insurees-button"]').click({ force: true });
  });
});