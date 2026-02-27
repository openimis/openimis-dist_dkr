// Test data
export const product = {
  code: "PRD-001",
  name: "Produit Test Cypress",
  maxMembers: "10",
  threshold: "5",
  insurancePeriod: "12",
  administrationPeriod: "2",
  recurrence: "1",
  ageMinimal: "18",
  ageMaximal: "65",
  dateFrom: "27",
  dateTo: "28",
  services: [{ code: "OBG Cervical" }, {code: "OBG Cervix"}],
  items: [{ code: "0001" }, { code: "0002" }]
};

export const updatedProduct = {
  name: "Produit Test Cypress Updated",
  maxMembers: "20"
};


// Product actions
const Product = {

  goToList: () => {
    cy.contains('Administration').click();
    cy.contains('a', 'Products').click();
  },

  goToForm: (product) => {
    Product.goToList();

    if (product?.code) {
      cy.enterMuiInput('Code', product.code, "input");
      cy.contains('button', 'Search').click({force: true});
      cy.openRow(product.code);
    } else {
      cy.get('[aria-label="Add new product"]').click();
    }
  },

  fillForm: (product) => {

    cy.enterMuiInput('Code', product.code);
    cy.enterMuiInput('Name', product.name);
    cy.enterMuiInput('Max members', product.maxMembers);
    cy.enterMuiInput('Threshold', product.threshold);
    cy.enterMuiInput('Insurance period', product.insurancePeriod);
    cy.enterMuiInput('Administration period', product.administrationPeriod);
    cy.enterMuiInput('Recurrence', product.recurrence);
    cy.enterMuiInput('Maximum Age', product.ageMinimal);
    cy.enterMuiInput('Maximum Age', product.ageMaximal);
    cy.chooseMuiSelect('Region', 'R1 Region 1');
    cy.chooseMuiSelect('District', 'R1D2 Jambero');

    cy.chooseMuiDatePicker('Date from', product.dateFrom);
    cy.chooseMuiDatePicker('Date to', product.dateTo);

    Product.addItems(product.items);
    Product.addServices(product.services);
  },

  update: (updatedData) => {

    if (updatedData.name) {
      cy.enterMuiInput('Name', updatedData.name);
    }

    if (updatedData.maxMembers) {
      cy.enterMuiInput('Max members', updatedData.maxMembers);
    }

    cy.save();
  },

  addItems: (items) => {
    cy.contains('button', 'Medical Items', {matchCase: false}).click();
    cy.contains('button', 'Add Items', {matchCase: false}).click();

    items.forEach(item => {
      cy.get('input[placeholder*="Search Item"]')
        .type(item.code);

      cy.get('body')
        .contains('li[role="option"]', item.code, { timeout: 10000 })
        .should('be.visible')
        .click({ force: true });
    });

    cy.contains('button', `Add ${items.length} items`, {matchCase: false}).click();
  },

  addServices: (services) => {
    cy.contains('button', 'Medical Services', {matchCase: false}).click();
    cy.contains('button', 'Add Services', {matchCase: false}).click();

    services.forEach(service => {
      cy.get('input[placeholder*="Search Service"]')
        .type(service.code);

      cy.get('body')
        .contains('li[role="option"]', service.code, { timeout: 10000 })
        .should('be.visible')
        .click({ force: true });
    });

    cy.contains('button', `Add ${services.length} items`, {matchCase: false}).click();
  },

  verifyExists: (product) => {
    Product.goToList();
    cy.enterMuiInput('Code', product.code, "input");
    cy.contains('button', 'Search').click({force: true});
    cy.contains(product.code);
  },

  delete: (product) => {
    Product.goToList();
    cy.enterMuiInput('Code', product.code, "input");
    cy.contains('button', 'Search').click({force: true});

    cy.contains('tr', product.code)
      .within(() => {
        cy.contains('button', 'Delete').click();
      });

    cy.contains('button', 'OK', {matchCase: false}).click();
  }

};

// Tests
describe.only('Product Workflow', () => {

  it('should execute complete product flow cleanly', () => {

    cy.login();

    // Create product
    Product.goToForm();
    Product.fillForm(product);
    cy.save();
    Product.verifyExists(product);

    // Update product
    Product.goToForm(product);
    Product.update(updatedProduct);

    // Delete product
    Product.delete(product);

  });

});