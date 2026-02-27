// Test data
export const openIMISHeadInsuree = {
  chfId: '070707070',
  firstName: 'Joseph',
  lastName: 'Macintyre',
  gender: 'Male',
};

export const openIMISPolicy = {
  product: {
    code: 'BCUL0001',
    name: 'Basic Cover Ultha'
  },
  value: 10000
}
export const policy = {
  product: {
    code: 'FCUL0001',
    name: 'Fixed Cycle Cover Ultha'
  },
  officer: { code: 'Admin Admin' },
};

export const premium = {
  amount: '250000',
  receiptNo: 'Receipt-0001',
  paymentDate: '26',
  payer: 'Coffee Farmers Association',
  paymentType: 'Cash',
};

// Policy actions
const Policy = {

  value: () => {
    return cy.contains('Policy value')
      .find('input')
      .invoke('val');
  },

  goToFamilyForm: (head) => {
    cy.goToSubMenu('Insurees and Policies', 'Families/Group');
    cy.enterMuiInput('Head Ins. No.', head.chfId, "input");
    cy.scrollTo('right');
    cy.contains('button', 'Search').click({ force: true });
    cy.openRow(head.chfId);
  },

  add: (head, policy) => {
    Policy.goToFamilyForm(head);

    cy.contains('button', 'Add policy').click({ force: true });

    cy.chooseMuiAutocomplete('Product', policy.product.name);
    cy.chooseMuiSelect('Officer', policy.officer.code);

    cy.save();
    cy.contains('button', 'Close').click();
  },

  select: (policy) => {
    cy.contains('tr', policy.product.code).click();
  },

  payPremium: (head, policy, premium) => {
    Policy.goToFamilyForm(head);
    Policy.select(policy);

    cy.get('[aria-label="Add new contribution"]').click({ force: true });
    
    // Fill form
    cy.chooseMuiDatePicker('Payment Date', premium.paymentDate);
    cy.chooseMuiSelect('Payer', premium.payer);
    cy.chooseMuiSelect('Payment Type', premium.paymentType);
    cy.enterMuiInput('Amount', premium.amount);
    cy.enterMuiInput('Receipt No.', premium.receiptNo);

    // Handle contribution messages
    cy.get('body').then(($body) => {
      // premium > policy value
      if ($body.text().includes('Sum of contributions exceeds policy value. Saving not allowed.')) {
        cy.log('Cannot save: contribution exceeds policy value.');
      } else {
        cy.save();

        cy.get('body').then(($dialogBody) => {

          // premium < policy value
          if ($dialogBody.text().includes('The contribution is lower than the policy value')) {
            cy.contains('button', 'OK').click();

            cy.get('body').then(($secondDialog) => {
              if ($secondDialog.text().includes('Should the policy come into force?')) {
                cy.contains('button', 'Yes').click();
              }
            });
          }
          // premium = policy value
          else if ($dialogBody.text().includes('The contribution matches the value of the policy')) {
            cy.contains('button', 'OK').click();
          }
        });
      }
    });
  },

  deletePremium: (head, policy, premium) => {
    Policy.goToFamilyForm(head);
    Policy.select(policy);

    cy.contains('tr', premium.receiptNo)
      .within(() => {
        cy.contains('button', 'Delete').click({force: true});
      });
    cy.contains('button', 'Yes').click();
  },

  delete: (head, policy) => {
    Policy.goToFamilyForm(head);
    Policy.select(policy);

    cy.contains('tr', policy.product.code)
      .within(() => {
        cy.contains('button', 'Delete').click({force: true});
      });
    cy.contains('button', 'Ok').click();
  }
};

// Tests
describe('Policy Workflow', () => {

  it('should add, pay and delete a policy cleanly', () => {

    cy.login();

    // Add policy
    Policy.add(openIMISHeadInsuree, policy);

    // Pay premium
    Policy.payPremium(
      openIMISHeadInsuree,
      openIMISPolicy,
      premium
    );

    // Delete premium
    Policy.deletePremium(
      openIMISHeadInsuree,
      openIMISPolicy,
      premium
    );

    // Delete policy
    Policy.delete(
      openIMISHeadInsuree,
      openIMISPolicy
    );

  });

});