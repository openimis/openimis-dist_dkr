// ------------------ TEST DATA ------------------
const product = {
  code: "PRD-001",
  name: "Produit Test Cypress",
  maxMembers: "10",
  threshold: "5",
  insurancePeriod: "12",
  administrationPeriod: "2",
  recurrence: "1",
  ageMinimal: "18",
  ageMaximal: "65",
  dateFrom: { day: '27', month: '02', year: '2026' },
  dateTo: { day: '28', month: '02', year: '2026' },
  services: [{ code: "OBG Cervical" }, { code: "OBG Cervix" }],
  items: [{ code: "0001" }, { code: "0002" }],
};

const updatedProduct = {
  name: "Produit Test Cypress Updated",
  maxMembers: "20",
};

// ------------------ NAVIGATION ------------------
const goToProductList = () => {
  cy.contains('Administration').click();
  cy.contains('a', 'Products').click();
};

const goToNewProductForm = () => {
  goToProductList();
  cy.get('[aria-label="Add new product"]').click();
};

const goToExistingProductForm = (product) => {
  goToProductList();

  cy.enterMuiInput('Code', product.code, 'input');
  cy.contains('button', 'Search').click({ force: true });
  cy.openRowByValue(product.code);
};

// ------------------ FORM ------------------
const fillProductForm = (product) => {
  cy.enterMuiInput('Code', product.code);
  cy.enterMuiInput('Name', product.name);
  cy.enterMuiInput('Max members', product.maxMembers);
  cy.enterMuiInput('Threshold', product.threshold);
  cy.enterMuiInput('Insurance period', product.insurancePeriod);
  cy.enterMuiInput('Administration period', product.administrationPeriod);
  cy.enterMuiInput('Recurrence', product.recurrence);
  cy.enterMuiInput('Minimum Age', product.ageMinimal);
  cy.enterMuiInput('Maximum Age', product.ageMaximal);

  cy.chooseMuiSelect('Region', 'R1 Region 1');
  cy.chooseMuiSelect('District', 'R1D2 Jambero');

  cy.chooseMuiDatePicker('Date from', product.dateFrom);
  cy.chooseMuiDatePicker('Date to', product.dateTo);

  addProductItems(product.items);
  addProductServices(product.services);
};

const updateProduct = (product, updatedData) => {
  goToExistingProductForm(product);

  if (updatedData.name) {
    cy.enterMuiInput('Name', updatedData.name);
  }

  if (updatedData.maxMembers) {
    cy.enterMuiInput('Max members', updatedData.maxMembers);
  }

  cy.save();
};

// ------------------ ITEMS & SERVICES ------------------
const addProductItems = (items) => {
  cy.contains('button', 'Medical Items', { matchCase: false }).click();
  cy.contains('button', 'Add Items', { matchCase: false }).click();

  items.forEach(item => {
    cy.get('input[placeholder*="Search Item"]').type(item.code);

    cy.get('body')
      .contains('li[role="option"]', item.code, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });
  });

  cy.contains('button', `Add ${items.length} items`, { matchCase: false }).click();
};

const addProductServices = (services) => {
  cy.contains('button', 'Medical Services', { matchCase: false }).click();
  cy.contains('button', 'Add Services', { matchCase: false }).click();

  services.forEach(service => {
    cy.get('input[placeholder*="Search Service"]').type(service.code);

    cy.get('body')
      .contains('li[role="option"]', service.code, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });
  });

  cy.contains('button', `Add ${services.length} services`, { matchCase: false }).click();
};

// ------------------ HELPERS ------------------
const formatDate = ({ day, month, year }) => {
  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');
  return `${d}-${m}-${year}`;
};

// ------------------ VERIFY ------------------
const verifyProductDetails = (product, updatedData = null) => {
  product = updatedData ? { ...product, ...updatedData } : product;

  goToExistingProductForm(product);

  cy.verifyMuiInputValue('Code', product.code);
  cy.verifyMuiInputValue('Name', product.name);
  cy.verifyMuiInputValue('Max members', product.maxMembers);
  cy.verifyMuiInputValue('Threshold', product.threshold);
  cy.verifyMuiInputValue('Insurance period', product.insurancePeriod);
  cy.verifyMuiInputValue('Administration period', product.administrationPeriod);
  cy.verifyMuiInputValue('Recurrence', product.recurrence);
  cy.verifyMuiInputValue('Minimum Age', product.ageMinimal);
  cy.verifyMuiInputValue('Maximum Age', product.ageMaximal);

  cy.verifyMuiDatePickerValue('Date from', formatDate(product.dateFrom));
  cy.verifyMuiDatePickerValue('Date to', formatDate(product.dateTo));

  product.items.forEach(item => {
    cy.contains(item.code).should('exist');
  });

  product.services.forEach(service => {
    cy.contains(service.code).should('exist');
  });
};

const verifyProductRemoved = (product) => {
  goToProductList();

  cy.enterMuiInput('Code', product.code, 'input');
  cy.contains('button', 'Search').click({ force: true });

  cy.get('body').then(($body) => {
    const exists = $body.find('tr').toArray().some(row =>
      row.innerText.includes(product.code)
    );

    expect(exists).to.be.false;
  });
};

// ------------------ DELETE ------------------
const deleteProduct = (product, { failIfMissing = true } = {}) => {
  goToProductList();

  cy.enterMuiInput('Code', product.code, 'input');
  cy.contains('button', 'Search').click({ force: true });

  cy.get('body').then(($body) => {
    const exists = $body.find('tr').toArray().some(row =>
      row.innerText.includes(product.code)
    );

    if (!exists) {
      if (!failIfMissing) return;
      throw new Error(`Product ${product.code} not found`);
    }

    cy.contains('tr', product.code)
      .within(() => cy.contains('button', 'Delete').click());

    cy.contains('button', 'OK', { matchCase: false }).click();
  });
};

// ------------------ TEST ------------------
describe('Product Workflow', () => {

  afterEach(() => {
    cy.login();
    deleteProduct(product, { failIfMissing: false });
  });

  it('should execute complete product flow cleanly', () => {

    cy.login();

    // --- Create ---
    goToNewProductForm();
    fillProductForm(product);
    cy.save();
    verifyProductDetails(product);

    // --- Update ---
    updateProduct(product, updatedProduct);
    verifyProductDetails(product, updatedProduct);

    // --- Delete ---
    deleteProduct(product);
    verifyProductRemoved(product);

  });

});