// ------------------ TEST DATA ------------------
const insurees = {
  head: {
    chfId: '697547030',
    givenNames: 'Sylvie',
    lastName: 'Chineze',
    gender: 'Female',
    phone: '602111111',
    email: 'sylvie@example.com',
    passport: 'AB7654321',
    maritalStatus: 'Married',
    profession: 'Employee',
    education: 'University',
    typeOfId: 'Passport',
    dob: { day: '15', month: '02', year: '1990' },
  },
  member: {
    chfId: '692651197',
    givenNames: 'Paul',
    lastName: 'Sandjong',
    gender: 'Male',
    phone: '602000000',
    email: 'paul@example.com',
    passport: 'AB1234567',
    maritalStatus: 'Married',
    profession: 'Employee',
    education: 'University',
    typeOfId: 'Passport',
    dob: { day: '18', month: '02', year: '1992' },
    updatedDob: { day: '19', month: '02', year: '1992' },
  },
};

const familyData = {
  location: 'R1D1M1V1 Rachla',
  familyType: 'Household',
  confirmationNo: 'CONF-001',
  confirmationType: 'Municipality',
  address: 'Douala, Cameroun',
};

// ------------------ GENERIC ------------------
const goToSubMenu = (menu, submenu) => {
  cy.contains(menu).click();
  cy.contains('a', submenu).click();
};

// ------------------ INSUREE ------------------
const goToInsureeList = () => goToSubMenu('Insurees and Policies', 'Insurees');

const goToNewInsureeForm = () => {
  goToInsureeList();
  cy.get('[aria-label="Create new Insuree"]').click();
};

const goToExistingInsureeForm = (insuree) => {
  goToInsureeList();

  cy.enterMuiInput('Insurance No.', insuree.chfId, 'input');
  cy.scrollTo('right');
  cy.contains('button', 'Search').click();
  cy.openRowByValue(insuree.chfId);
};

const fillInsureeForm = (insuree) => {
  cy.enterMuiInput('Insurance No.', insuree.chfId, 'input');
  cy.enterMuiInput('Last Name', insuree.lastName);
  cy.enterMuiInput('Given Names', insuree.givenNames);
  cy.enterMuiInput('Phone', insuree.phone);
  cy.enterMuiInput('Email', insuree.email);
  cy.chooseMuiDatePicker('Birth Date', insuree.dob);
  cy.chooseMuiSelect('Profession', insuree.profession);
  cy.chooseMuiSelect('Education', insuree.education);
  cy.chooseMuiSelect('Id Type', insuree.typeOfId);
  cy.chooseMuiSelect('Marital Status', insuree.maritalStatus);
  cy.chooseMuiSelect('Gender', insuree.gender);
};

const formatDate = ({ day, month, year }) => {
  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');
  return `${d}-${m}-${year}`;
};

const verifyInsureeDetails = (insuree, updatedData = null) => {
  insuree = updatedData ? { ...insuree, ...updatedData } : insuree;

  goToExistingInsureeForm(insuree);

  cy.verifyMuiInputValue('Insurance No.', insuree.chfId);
  cy.verifyMuiInputValue('Last Name', insuree.lastName);
  cy.verifyMuiInputValue('Given Names', insuree.givenNames);
  cy.verifyMuiInputValue('Phone', insuree.phone);
  cy.verifyMuiInputValue('Email', insuree.email);
  cy.verifyMuiSelectValue('Profession', insuree.profession);
  cy.verifyMuiSelectValue('Education', insuree.education);
  cy.verifyMuiSelectValue('Id Type', insuree.typeOfId);
  cy.verifyMuiSelectValue('Marital Status', insuree.maritalStatus);
  cy.verifyMuiSelectValue('Gender', insuree.gender);
  cy.verifyMuiDatePickerValue('Birth Date', formatDate(insuree.dob));
};

const deleteInsuree = (insuree, { failIfMissing = true } = {}) => {
  goToInsureeList();
  cy.enterMuiInput('Insurance No.', insuree.chfId, 'input');
  cy.contains('button', 'Search').click();
  cy.scrollTo('right');

  cy.get('body').then(($body) => {
    const exists = $body.find('tr').toArray().some(row =>
      row.innerText.includes(insuree.chfId)
    );

    if (!exists) {
      if (!failIfMissing) {
        cy.log(`Insuree ${insuree.chfId} not found`);
        return;
      }
      throw new Error(`Insuree ${insuree.chfId} not found`);
    }

    cy.contains('tr', insuree.chfId)
      .within(() => cy.contains('button', 'Delete').click());
    cy.contains('button', 'OK').click();
  });
};

// ------------------ FAMILY ------------------
const goToFamilyList = () => goToSubMenu('Insurees and Policies', 'Families/Group');

const goToExistingFamilyForm = (head) => {
  goToFamilyList();

  cy.enterMuiInput('Head Ins. No.', head.chfId, 'input');
  cy.scrollTo('right');
  cy.contains('button', 'Search').click({ force: true });

  cy.openRowByValue(head.chfId);
};

const goToNewFamilyForm = () => {
  goToFamilyList();

  cy.get('[aria-label="Create new Family"]')
    .find('button')
    .click({ force: true });
};

const fillFamilyForm = (data) => {
  cy.chooseMuiSelect('Village', data.location);
  cy.chooseMuiSelect('Family Type', data.familyType);
  cy.chooseMuiSelect('Confirmation Type', data.confirmationType);
  cy.enterMuiInput('Confirmation No.', data.confirmationNo);
  cy.enterMuiInput('Address details', data.address, 'textarea');
};

const verifyFamilyDetails = (head, updatedData = null) => {
  head = updatedData ? { ...head, ...updatedData } : head;

  goToExistingFamilyForm(head);

  cy.verifyMuiInputValue('Head Ins. No.', head.chfId);
  cy.verifyMuiInputValue('Confirmation No.', head.confirmationNo);
  cy.verifyMuiSelectValue('Village', familyData.location);
  cy.verifyMuiSelectValue('Family Type', familyData.familyType);
  cy.verifyMuiSelectValue('Confirmation Type', familyData.confirmationType);
  cy.verifyMuiInputValue('Address details', familyData.address, 'textarea');

  // Si le head a des membres, vérifier qu'ils apparaissent
  if (head.members?.length) {
    head.members.forEach((member) => {
      cy.contains('tr', member.chfId).should('exist');
    });
  }
};

const addFamilyMember = (head, member) => {
  goToExistingFamilyForm(head);
  cy.contains('button', 'Add existing').click();
  cy.enterMuiInput('Insurance No.', member.chfId, 'input');
  cy.openRowByValue(member.chfId);
  cy.contains('button', 'Move and cancel policies').click();
};

const removeFamilyMember = (head, member) => {
  goToExistingFamilyForm(head);
  cy.contains('tr', member.chfId)
    .within(() => cy.contains('button', 'Remove').click());
  cy.contains('button', 'Remove and cancel policies').click();
};

const deleteFamily = (head, { failIfMissing = true } = {}) => {
  goToFamilyList();
  cy.enterMuiInput('Head Ins. No.', head.chfId, 'input');
  cy.contains('button', 'Search').click();
  cy.scrollTo('right');

  cy.get('body').then(($body) => {
    const exists = $body.find('tr').toArray().some(row =>
      row.innerText.includes(head.chfId)
    );

    if (!exists) {
      if (!failIfMissing) {
        cy.log(`Family ${head.chfId} not found`);
        return;
      }
      throw new Error(`Family ${head.chfId} not found`);
    }

    cy.contains('tr', head.chfId)
      .within(() => cy.contains('button', 'Delete').click());
    cy.contains('button', 'Delete family and members').click();
  });
};

const verifyFamilyMemberRemoved = (head, member) => {
  goToExistingFamilyForm(head);

  cy.get('body').then(($body) => {
    const exists = $body.find('tr').toArray().some(row =>
      row.innerText.includes(member.chfId)
    );

    expect(exists).to.be.false;
  });
};

// ------------------ TESTS ------------------
describe('Family & Insuree Workflow', () => {

  afterEach(() => {
    deleteFamily(insurees.head, { failIfMissing: false });
    deleteInsuree(insurees.member, { failIfMissing: false });
    deleteInsuree(insurees.head, { failIfMissing: false });
  });

  it('should execute complete flow cleanly', () => {
    cy.login();

    // --- Insuree creation ---
    goToNewInsureeForm();
    fillInsureeForm(insurees.member);
    cy.save();
    verifyInsureeDetails(insurees.member);

    // --- Family creation ---
    goToNewFamilyForm();
    fillFamilyForm(familyData);
    fillInsureeForm(insurees.head);
    cy.save();
    verifyFamilyDetails(insurees.head);

    // --- Insuree update ---
    cy.openRowByValue(insurees.member.chfId);
    cy.chooseMuiDatePicker('Birth Date', insurees.member.updatedDob);
    cy.save();
    verifyInsureeDetails(insurees.member, { dob: insurees.member.updatedDob });

    // --- Family update ---
    cy.openRowByValue(insurees.head.chfId);
    cy.enterMuiInput('Confirmation No.', 'CONF-002');
    cy.save();
    verifyFamilyDetails(insurees.head, { confirmationNo: 'CONF-002' });

    // --- Add / Remove family member ---
    addFamilyMember(insurees.head, insurees.member);
    removeFamilyMember(insurees.head, insurees.member);
    verifyFamilyMemberRemoved(insurees.head, insurees.member);
  });

});