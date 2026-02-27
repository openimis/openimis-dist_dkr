// Test data

export const insurees = {
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
    dobDay: '15'
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
    dobDay: '18'
  }
};

export const familyData = {
  location: 'R1D1M1V1 Rachla',
  familyType: 'Household',
  confirmationNo: 'CONF-001',
  confirmationType: 'Municipality',
  address: 'Douala, Cameroun'
};


// Generic helpers
const goToSubMenu = (menu, submenu) => {
  cy.contains(menu).click();
  cy.contains('a', submenu).click();
};

// Insuree actions
const Insuree = {
  goToList: () => goToSubMenu('Insurees and Policies', 'Insurees'),

  goToForm: (insuree) => {
    Insuree.goToList();

    if (insuree?.chfId) {
      cy.enterMuiInput('Insurance No.', insuree.chfId, "input");
      cy.scrollTo('right');
      cy.contains('button', 'Search').click();
      cy.openRow(insuree.chfId);
    } else {
      cy.get('[aria-label="Create new Insuree"]').click();
    }
  },

  fillForm: (insuree) => {
    cy.enterMuiInput('Insurance No.', insuree.chfId, "input");
    cy.enterMuiInput('Last Name', insuree.lastName);
    cy.enterMuiInput('Given Names', insuree.givenNames);
    cy.enterMuiInput('Phone', insuree.phone);
    cy.enterMuiInput('Email', insuree.email);

    cy.chooseMuiDatePicker('Birth Date', insuree.dobDay);
    
    cy.chooseMuiSelect('Profession', insuree.profession);
    cy.chooseMuiSelect('Education', insuree.education);
    cy.chooseMuiSelect('Id Type', insuree.typeOfId);
    cy.chooseMuiSelect('Marital Status', insuree.maritalStatus);
    cy.chooseMuiSelect('Gender', insuree.gender);
  },

  verifyExists: (insuree) => {
    Insuree.goToList();
    cy.enterMuiInput('Insurance No.', insuree.chfId, "input");
    cy.scrollTo('right');
    cy.contains('button', 'Search').click();
    cy.contains(insuree.givenNames);
    cy.contains(insuree.chfId);
  },

  delete: (insuree) => {
    Insuree.goToList();
    cy.enterMuiInput('Insurance No.', insuree.chfId, "input");
    cy.contains('button', 'Search').click();
    cy.scrollTo('right');
    cy.contains('tr', insuree.chfId)
      .within(() => {
        cy.contains('button', 'Delete').click();
      });
    cy.contains('button', 'OK').click();
  }
};


// Family actions
const Family = {
  goToList: () => goToSubMenu('Insurees and Policies', 'Families/Group'),

  goToForm: (head) => {
    Family.goToList();

    if (head?.chfId) {
      cy.enterMuiInput('Head Ins. No.', head.chfId, "input");
      cy.scrollTo('right');
      cy.contains('button', 'Search').click({force: true});
      cy.openRow(head.chfId);
    } else {
      cy.get('[aria-label="Create new Family"]')
      .find('button')
      .click({force: true});
    }
  },

  fillForm: (data) => {
    cy.chooseMuiSelect('Village', data.location);
    cy.chooseMuiSelect('Family Type', data.familyType);
    cy.chooseMuiSelect('Confirmation Type', data.confirmationType);
    cy.enterMuiInput('Confirmation No.', data.confirmationNo);
    cy.enterMuiInput('Address details', data.address, 'textarea');
  },

  verifyExists: (head) => {
    Family.goToList();
    cy.enterMuiInput('Head Ins. No.', head.chfId, "input");
    cy.scrollTo('right');
    cy.contains('button', 'Search').click({force: true});
    cy.contains(head.lastName);
    cy.contains(head.givenNames);
    cy.contains(head.chfId);
  },

  addMember: (head, member) => {
    Family.goToForm(head);
    cy.contains('button', 'Add existing').click()
    cy.contains('label', 'Insurance No.').type(member.chfId)
    cy.openRow(member.chfId)

    cy.contains('button', 'Move and cancel policies').click();
  },

  removeMember: (head, member) => {
    Family.goToForm(head);
    cy.contains('tr', member.chfId)
      .within(() => {
        cy.contains('button', 'Remove').click();
      });
    cy.contains('button', 'Remove and cancel policies').click();
  },

  delete: (head) => {
    Family.goToList();
    cy.enterMuiInput('Head Ins. No.', head.chfId, "input");
    cy.contains('button', 'Search').click();
    cy.scrollTo('right');
    cy.contains('tr', head.chfId)
      .within(() => {
        cy.contains('button', 'Delete').click();
      });
    cy.contains('button', 'Delete family and members').click();
  }
};

// Tests
describe.only('Family & Insuree Workflow', () => {

  it('should execute complete flow cleanly', () => {
    cy.login();

    // Create insuree
    Insuree.goToForm();
    Insuree.fillForm(insurees.member);
    cy.save();
    Insuree.verifyExists(insurees.member);

    // Create family with head
    Family.goToForm();
    Family.fillForm(familyData);
    Insuree.fillForm(insurees.head);
    cy.save();
    Family.verifyExists(insurees.head);

    // Modify member DOB
    Insuree.verifyExists(insurees.member);
    cy.openRow(insurees.member.chfId);

    cy.chooseMuiDatePicker('Birth Date', insurees.member.dobDay);

    cy.save();

    // Modify family
    Family.verifyExists(insurees.head);
    cy.openRow(insurees.head.chfId);

    cy.enterMuiInput('Confirmation No.', 'CONF-002');

    cy.save();

    // Add / Remove member
    Family.addMember(insurees.head, insurees.member);
    Family.removeMember(insurees.head, insurees.member);

    // Cleanup
    Insuree.delete(insurees.member);
    Family.delete(insurees.head);
   });

});