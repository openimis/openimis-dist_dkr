// ------------------ TEST DATA ------------------
const openIMISHeadInsuree = {
  chfId: '070707070',
  firstName: 'Joseph',
  lastName: 'Macintyre',
  gender: 'Male',
};

const openIMISPolicy = {
  product: {
    code: 'BCUL0001',
    name: 'Basic Cover Ultha',
  },
  value: 10000,
};

const policy = {
  product: {
    code: 'FCUL0001',
    name: 'Fixed Cycle Cover Ultha',
  },
  officer: { code: 'Admin Admin' },
};

const premium = {
  amount: '250000',
  receiptNo: 'Receipt-0001',
  paymentDate: { day: '26', month: '02', year: '2026' },
  payer: 'Coffee Farmers Association',
  paymentType: 'Cash',
};

// ------------------ NAVIGATION ------------------
const goToFamilyList = () => {
  cy.goToSubMenu('Insurees and Policies', 'Families/Group');
};

const goToExistingFamilyForm = (head) => {
  goToFamilyList();

  cy.enterMuiInput('Head Ins. No.', head.chfId, 'input');
  cy.scrollTo('right');
  cy.contains('button', 'Search').click({ force: true });

  cy.openRowByValue(head.chfId);
};

// ------------------ HELPERS ------------------
const selectPolicy = (policy) => {
  cy.contains('tr', policy.product.code).click();
};

// ------------------ POLICY ------------------
const addPolicy = (head, policy) => {
  goToExistingFamilyForm(head);

  cy.contains('button', 'Add policy').click({ force: true });
  cy.chooseMuiAutocomplete('Product', policy.product.name);
  cy.chooseMuiSelect('Officer', policy.officer.code);

  cy.save();
  cy.contains('button', 'Close').click();
};

const verifyPolicyDetails = (head, policy, updatedData = null) => {
  policy = updatedData ? { ...policy, ...updatedData } : policy;

  goToExistingFamilyForm(head);

  cy.contains('tr', policy.product.code).should('exist');
  cy.contains('tr', policy.product.code).within(() => {
    cy.contains(policy.product.name).should('exist');
  });
};

const verifyPolicyRemoved = (head, policy) => {
  goToFamilyList();

  cy.enterMuiInput('Head Ins. No.', head.chfId, 'input');
  cy.contains('button', 'Search').click({ force: true });

  cy.get('body').then(($body) => {
    const exists = $body.find('tr').toArray().some(row =>
      row.innerText.includes(policy.product.code)
    );

    expect(exists).to.be.false;
  });
};

// ------------------ PREMIUM ------------------
const payPremium = (head, policy, premium) => {
  goToExistingFamilyForm(head);
  selectPolicy(policy);

  cy.get('[aria-label="Add new contribution"]').click({ force: true });

  cy.chooseMuiDatePicker('Payment Date', premium.paymentDate);
  cy.chooseMuiSelect('Payer', premium.payer);
  cy.chooseMuiSelect('Payment Type', premium.paymentType);
  cy.enterMuiInput('Amount', premium.amount);
  cy.enterMuiInput('Receipt No.', premium.receiptNo);

  cy.save();

  cy.get('body').then(($dialog) => {
    if ($dialog.text().includes('lower than the policy value')) {
      cy.contains('button', 'OK').click();
      cy.contains('button', 'Yes').click();
    }

    if ($dialog.text().includes('matches the value')) {
      cy.contains('button', 'OK').click();
    }
  });
};

const verifyPremiumDetails = (head, policy, premium, updatedData = null) => {
  premium = updatedData ? { ...premium, ...updatedData } : premium;

  goToExistingFamilyForm(head);
  selectPolicy(policy);

  cy.contains('tr', premium.receiptNo).should('exist');
  cy.contains('tr', premium.receiptNo).within(() => {
    cy.contains(premium.amount).should('exist');
  });
};

const verifyPremiumRemoved = (head, policy, premium) => {
  goToExistingFamilyForm(head);
  selectPolicy(policy);

  cy.get('body').then(($body) => {
    const exists = $body.find('tr').toArray().some(row =>
      row.innerText.includes(premium.receiptNo)
    );

    expect(exists).to.be.false;
  });
};

// ------------------ DELETE ------------------
const deletePremium = (head, policy, premium, { failIfMissing = true } = {}) => {
  goToExistingFamilyForm(head);

  cy.get('body').then(($body) => {
    const exists = $body.find('tr').toArray().some(row =>
      row.innerText.includes(premium.receiptNo)
    );

    if (!exists) {
      if (!failIfMissing) return;
      throw new Error(`Premium ${premium.receiptNo} not found`);
    }

    selectPolicy(policy);

    cy.contains('tr', premium.receiptNo)
      .within(() => cy.contains('button', 'Delete').click({ force: true }));

    cy.contains('button', 'Yes').click();
  });
};

const deletePolicy = (head, policy, { failIfMissing = true } = {}) => {
  goToExistingFamilyForm(head);

  cy.get('body').then(($body) => {
    const exists = $body.find('tr').toArray().some(row =>
      row.innerText.includes(policy.product.code)
    );

    if (!exists) {
      if (!failIfMissing) return;
      throw new Error(`Policy ${policy.product.code} not found`);
    }

    cy.contains('tr', policy.product.code)
      .within(() => cy.contains('button', 'Delete').click({ force: true }));

    cy.contains('button', 'Ok').click();
  });
};

// ------------------ TEST ------------------
describe('Policy Workflow', () => {

  afterEach(() => {
    cy.login();
    deletePremium(openIMISHeadInsuree, openIMISPolicy, premium, { failIfMissing: false });
    deletePolicy(openIMISHeadInsuree, openIMISPolicy, { failIfMissing: false });
    deletePolicy(openIMISHeadInsuree, policy, { failIfMissing: false });
  });

  it('should execute complete policy flow cleanly', () => {

    cy.login();

    // --- Add policy ---
    addPolicy(openIMISHeadInsuree, policy);
    verifyPolicyDetails(openIMISHeadInsuree, policy);

    // --- Pay premium ---
    payPremium(openIMISHeadInsuree, openIMISPolicy, premium);
    verifyPremiumDetails(openIMISHeadInsuree, openIMISPolicy, premium);

    // --- Delete premium ---
    deletePremium(openIMISHeadInsuree, openIMISPolicy, premium);
    verifyPremiumRemoved(openIMISHeadInsuree, openIMISPolicy, premium);

    // --- Delete policy ---
    deletePolicy(openIMISHeadInsuree, openIMISPolicy);
    verifyPolicyRemoved(openIMISHeadInsuree, openIMISPolicy);

  });

});