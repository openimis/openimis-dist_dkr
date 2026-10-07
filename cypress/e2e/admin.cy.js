const path = require('path');

describe('Django admin workflows', () => {
  before(function () {
    // This ensures that Admin user's core user exists
    // because is only auto provisioned on first login to the frontend UI
    cy.login()
    cy.logout()
  });

  beforeEach(function () {
    cy.loginAdminInterface()
  });

  it('Configures menu', function () {
    cy.deleteModuleConfig("fe-core")
    cy.visit('/front')
    cy.get('div.MuiToolbar-root').should('exist') // default top toolbar menu

    cy.visit('/api/admin');
    cy.contains('a', 'Module configurations').click()

    // Create menu config using fixture config file
    cy.contains('a', 'Add module configuration').click()
    cy.get('input[name="module"]').type('fe-core')
    cy.get('select[name="layer"]').select('frontend')
    cy.get('input[name="version"]').type(1)

    cy.fixture('menu-config-sp.json').then((config) => {
      const configString = JSON.stringify(config, null, 2);
      cy.get('textarea[name="config"]')
        .type(configString, {
          parseSpecialCharSequences: false,
          delay: 0  // Type faster
        });
      cy.get('input[name="is_exposed"]').check()

      cy.get('input[value="Save"]').click()

      cy.visit('/front')
      cy.get('div.MuiDrawer-root').should('exist') // left drawer menu

      const expectedMenuItems = [
        'Social Protection',
        'Dashboards',
        'Payments',
        'Grievance',
        'Tasks Management',
        'Administration',
      ]
      const programMenuText = 'Programs'
      const expectedSubMenuItems = [
        'Individuals',
        'Groups',
        'Import Data - API',
        programMenuText,
      ]
      cy.get('div.MuiDrawer-root').first().within(() => {
        cy.shouldHaveMenuItemsInOrder(expectedMenuItems)

        cy.contains('button.MuiAccordionSummary-root', 'Social Protection').click();

        cy.contains('button.MuiAccordionSummary-root', 'Social Protection')
          .parents('.MuiAccordion-root')
          .find('.MuiCollapse-root').within(() => {
            cy.shouldHaveMenuItemsInOrder(expectedSubMenuItems)

            // Verify submenu persistence selected state
            cy.contains('a.MuiListItem-root', programMenuText).click();
            cy.contains('a.MuiListItem-root.menuItemActive', programMenuText);

            cy.contains('a.MuiListItem-root', 'Individuals').click();
            cy.contains('a.MuiListItem-root.menuItemActive', 'Individuals');

            cy.visit('/front/benefitPlans')
            cy.contains('a.MuiListItem-root.menuItemActive', programMenuText);
          })
      });
    })
  })

  it('Configuring individual json schema reflects in advanced filters and upload template', function () {
    cy.setModuleConfig('individual', 'individual-config-minimal.json')

    cy.visit('/front/individuals')
    cy.contains('li', 'UPLOAD').click()
    cy.contains('button', 'Template').click()

    const downloadedFilename = path.join(
      Cypress.config('downloadsFolder'),
      'individual_upload_template.csv'
    );
    cy.readFile(downloadedFilename, { timeout: 15000 }).should('exist');

    cy.readFile(downloadedFilename)
      .then(async (text) => {
        expect(text.length).to.be.greaterThan(0);
        expect(text).to.contain('able_bodied');
        expect(text).to.contain('educated_level');
        expect(text).to.contain('number_of_children');
      });

    cy.contains('button', 'Cancel').click()
    cy.contains('button', 'Advanced Filters').click()
    cy.get('div[role="dialog"] div.MuiSelect-select').click()
    cy.contains('li[role="option"]', 'Able bodied')
    cy.contains('li[role="option"]', 'Educated level')
    cy.contains('li[role="option"]', 'Number of children')
  })

  it('Configures project activities', function () {
    const activities = [
      'E2E Tree Planting',
      'E2E River Cleaning',
      'E2E Soil Conservation',
      'E2E Extra',
    ];
    const newName = 'E2E Water Conservation'

    cy.deleteActivities(activities.concat([newName]))

    // Create
    activities.forEach(activityName => {
      cy.contains('a', 'Activities').click()
      cy.contains('a', 'Add Activity').click()
      cy.get('input[name="name"]').type(activityName)
      cy.get('input[value="Save"]').click()
      cy.contains('td.field-name', activityName)
    })

    // Update
    cy.contains('td.field-name', 'E2E Soil Conservation')
      .parent('tr')
      .find('th.field-id a')
      .click();
    cy.get('input[name="name"]').clear().type(newName)
    cy.get('input[value="Save"]').click()
    cy.contains('td.field-name', newName)
      .parent('tr')
      .within(() => {
        cy.get('td.field-name').should('contain', newName);
        cy.get('td.field-version').should('have.text', '2');
      });

    // Soft Delete
    cy.contains('td.field-name', 'E2E Extra')
      .parent('tr')
      .find('th.field-id a')
      .click();
    cy.get('input[name="is_deleted"]').check()
    cy.get('input[value="Save"]').click()
    cy.contains('td.field-name', 'E2E Extra')
      .siblings('td.field-is_deleted')
      .find('img[alt="True"]')
      .should('exist');
  })
})

