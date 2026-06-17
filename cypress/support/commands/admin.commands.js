export function registerAdminCommands() {
  Cypress.Commands.add('deleteModuleConfig', (moduleName) => {
    cy.visit('/api/admin/core/moduleconfiguration/');

    cy.get('body').then(($body) => {
      if ($body.text().includes('0 module configurations')) {
        Cypress.log({
          name: 'deleteModuleConfig',
          message: 'No module configurations found, skipping deletion.',
        });
      } else {
        cy.get('table#result_list').then(($table) => {
          const configLink = $table.find(`a:contains("${moduleName}")`);

          if (configLink.length) {
            cy.wrap(configLink).click();
            cy.contains('a.deletelink', 'Delete').click();
            cy.get('input[type="submit"][value*="Yes"]').click();
            cy.contains(`a:contains("${moduleName}")`).should('not.exist');
          } else {
            Cypress.log({
              name: 'deleteModuleConfig',
              message: `Module Configuration named ${moduleName} not found, nothing to delete.`,
            });
          }
        });
      }
    });
  });

  Cypress.Commands.add('shouldHaveMenuItemsInOrder', (expectedMenuNames) => {
    cy.get('div[role="button"]')
      .filter(':visible')
      .should(($buttons) => {
        expect($buttons).to.have.length(expectedMenuNames.length);

        // Check each sub menu item text and order
        expectedMenuNames.forEach((itemText, index) => {
          expect($buttons.eq(index)).to.contain(itemText);
        });
      });
  });

  Cypress.Commands.add('deleteActivities', (activityNames) => {
    cy.visit('/api/admin/social_protection/activity/');
    cy.get('body').then(($body) => {
      let checkedAny = false;
      activityNames.forEach((activityName) => {
        if ($body.find(`td.field-name:contains("${activityName}")`).length) {
          // Check the checkbox in the same row as the activity name
          cy.contains('td.field-name', activityName)
            .parent('tr')
            .find('input[type="checkbox"]')
            .check();
          checkedAny = true;
        }
      });

      if (!checkedAny) {
        Cypress.log({
          name: 'deleteActivity',
          message: 'Activities not found, nothing to delete',
        });
        return;
      }

      // Select the delete action and submit
      cy.get('select[name="action"]').select('delete_selected');
      cy.get('button[type="submit"]').contains('Go').click();

      // Confirm the deletion
      cy.get('input[type="submit"][value*="Yes"]').click();

      // Verify deletion
      activityNames.forEach((activityName) => {
        cy.contains('td.field-name', activityName).should('not.exist');
      });
    });
  });

  Cypress.Commands.add('createActivities', (activities) => {
    cy.deleteActivities(activities);

    activities.forEach((activityName) => {
      cy.contains('a', 'Activities').click();
      cy.contains('a', 'Add Activity').click();
      cy.get('input[name="name"]').type(activityName);
      cy.get('input[value="Save"]').click();
      cy.contains('td.field-name', activityName);
    });
  });

  Cypress.Commands.add('setModuleConfig', (moduleName, configFixtureFile) => {
    cy.deleteModuleConfig(moduleName);

    cy.contains('a', 'Module configurations').click();

    // Create module config using fixture config file
    cy.contains('a', 'Add module configuration').click();
    cy.get('input[name="module"]').type(moduleName);
    cy.get('select[name="layer"]').select('backend');
    cy.get('input[name="version"]').type(1);

    cy.fixture(configFixtureFile).then((config) => {
      const configString = JSON.stringify(config, null, 2);
      cy.get('textarea[name="config"]')
        .type(configString, {
          parseSpecialCharSequences: false,
          delay: 0,
        });

      cy.get('input[value="Save"]').click();
      cy.contains('was added successfully');
    });
  });

  Cypress.Commands.add('setFrontendModuleConfig', (moduleName, configFixtureFile) => {
    cy.deleteModuleConfig(moduleName);
    cy.visit('/api/admin/core/moduleconfiguration/');
    cy.contains('a', 'Add module configuration').click();
    cy.get('input[name="module"]').type(moduleName);
    cy.get('select[name="layer"]').select('frontend');
    cy.get('input[name="version"]').type(1);

    cy.fixture(configFixtureFile).then((config) => {
      const configString = JSON.stringify(config, null, 2);
      cy.get('textarea[name="config"]')
        .type(configString, {
          parseSpecialCharSequences: false,
          delay: 0,
        });
      cy.get('input[name="is_exposed"]').check();
      cy.get('input[value="Save"]').click();
      cy.contains('was added successfully');
    });
  });
}
