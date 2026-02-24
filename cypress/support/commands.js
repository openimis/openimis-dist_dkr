const getTodayFormatted = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}-${month}-${year}`;
};

Cypress.Commands.add('login', () => {
  cy.visit('/front');
  cy.fixture('cred').then((cred) => {
    cy.get('input[type="text"]').type(cred.username)
    cy.get('input[type="password"]').type(cred.password)
    cy.get('button[type="submit"]').click()
    cy.contains('Welcome Admin Admin!')
  })
})

Cypress.Commands.add('logout', () => {
  cy.visit('/front');
  cy.get('button[title="Log out"]').click()
  cy.contains('label', 'Username')
})

Cypress.Commands.add('loginAdminInterface', () => {
  cy.visit('/api/admin');
  cy.fixture('cred').then((cred) => {
    cy.get('input[type="text"]').type(cred.username)
    cy.get('input[type="password"]').type(cred.password)
    cy.get('input[type="submit"]').click()
    cy.contains('Site administration').should('be.visible')
  })
})

Cypress.Commands.add('logoutAdminInterface', () => {
  cy.visit('/api/admin');
  cy.contains('button', 'Log out').click()
})

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
})

Cypress.Commands.add('deleteActivities', (activityNames) => {
  cy.visit('/api/admin/social_protection/activity/');
  cy.get('body').then(($body) => {
    let checkedAny = false;
    activityNames.forEach(activityName => {
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
        message: `Activities not found, nothing to delete`,
      });
      return
    }

    // Select the delete action and submit
    cy.get('select[name="action"]').select('delete_selected');
    cy.get('button[type="submit"]').contains('Go').click();

    // Confirm the deletion
    cy.get('input[type="submit"][value*="Yes"]').click()

    // Verify deletion
    activityNames.forEach(activityName => {
      cy.contains('td.field-name', activityName).should('not.exist');
    });
  });
});

Cypress.Commands.add('createActivities', (activities) => {
  cy.deleteActivities(activities)

  activities.forEach(activityName => {
    cy.contains('a', 'Activities').click()
    cy.contains('a', 'Add Activity').click()
    cy.get('input[name="name"]').type(activityName)
    cy.get('input[value="Save"]').click()
    cy.contains('td.field-name', activityName)
  })
})

Cypress.Commands.add('deleteProject', (projectPath) => {
  cy.visit(projectPath);
  cy.get('button[title="Delete"]').click();
  cy.contains('button', 'Ok').click();

  // Check redirect
  cy.location('pathname').should('not.include', projectPath);

  // Check last journal message
  cy.get('ul.MuiList-root li').first().click()
  cy.contains(`Delete project`).should('exist')
  cy.contains('Failed to delete').should('not.exist')
})

Cypress.Commands.add('createProject', (
  programName,
  projectName,
  activityName,
  regionName,
  districtName,
  targetBeneficiaries,
  workingDays,
) => {
  cy.visit('/front/benefitPlans');
  cy.openProgramForEditFromList(programName)
  cy.contains('button', 'Projects').click()
  cy.contains('button', 'Create Project').click()
  cy.contains('h6', 'Project details')

  cy.enterMuiInput('Name', projectName)

  cy.chooseMuiAutocomplete('Activity', activityName)

  cy.chooseMuiAutocomplete('Location', regionName)
  if (districtName) {
    cy.contains('li', districtName).click()
  }

  cy.enterMuiInput('Target Beneficiaries', targetBeneficiaries)

  cy.enterMuiInput('Working Days', workingDays)

  cy.get('[title="Save"] button').click()

  // Wait for creation to complete
  cy.get('ul.MuiList-root li div[role="progressbar"]').should('exist')
  cy.get('ul.MuiList-root li div[role="progressbar"]').should('not.exist')

  // Check last journal message
  cy.get('ul.MuiList-root li').first().click()
  cy.contains(`Create project ${projectName}`).should('exist')
  cy.contains('Failed to create').should('not.exist')
})

Cypress.Commands.add('deleteProgram', (programName) => {
  cy.visit('/front/benefitPlans');
  cy.contains('tfoot', 'Rows Per Page').should('be.visible')

  cy.get('body').then(($body) => {
    const programRows = $body.find(`td:contains("${programName}")`).closest('tr');

    if (programRows.length > 0) {
      cy.log(`Found ${programRows.length} program(s) to delete`);

      programRows.each((_, row) => {
        cy.wrap(row).within(() => {
          // Find and click the Delete button in this row
          cy.get('button[title="Delete"]')
            .click({force: true});
        });

        // Confirm deletion in dialog
        cy.contains('button', 'Ok')
          .should('be.visible')
          .click();

        // Wait for deletion to complete
        cy.get('ul.MuiList-root li div[role="progressbar"]').should('exist')

        // Verify deletion in expanded journal drawer
        cy.get('.MuiDrawer-paperAnchorRight button')
          .first()
          .click();

        cy.get('ul.MuiList-root li')
          .first()
          .should('contain', 'Delete program');
          // .should('contain', `Delete program ${programName}`); //TODO: switch to this after fix

        // Close journal drawer
        cy.get('.MuiDrawer-paperAnchorRight button')
          .first()
          .click();
      });
    } else {
      Cypress.log({
        name: 'deleteProgram',
        message: `No programs found with name "${programName}"`,
      });
    }
  });
});

Cypress.Commands.add('createProgram', (programCode, programName, maxBeneficiaries, programType) => {
  cy.visit('/front/benefitPlans');
  cy.get('[title="Create"] button').click()

  cy.enterMuiInput('Code', programCode)

  cy.enterMuiInput('Name', programName)

  cy.contains('label', 'Date from')
    .parent()
    .click()
  cy.contains('button', 'OK')
    .click()

  cy.contains('label', 'Date to')
    .parent()
    .click()
  cy.contains('button', 'OK')
    .click()

  cy.enterMuiInput('Max Beneficiaries', maxBeneficiaries)

  cy.contains('label', 'Type')
    .parent()
    .click()
  cy.contains('li[role="option"]', programType)
    .click()

  cy.get('[title="Save changes"] button').click()

  // Wait for creation to complete
  cy.get('ul.MuiList-root li div[role="progressbar"]').should('exist')
  cy.get('ul.MuiList-root li div[role="progressbar"]').should('not.exist')

  // Check last journal message
  cy.get('ul.MuiList-root li').first().click()
  cy.contains('Create program').should('exist')
  cy.contains('Failed to create').should('not.exist')
})

Cypress.Commands.add('openProgramForEditFromList', (programName) => {
  cy.contains('tfoot', 'Rows Per Page')
  cy.contains('td', programName)
    .parent('tr').within(() => {
      // click on edit button
      cy.get('a.MuiIconButton-root').click()
    })
  cy.assertMuiInput('Name', programName)
})

Cypress.Commands.add('checkProgramUpdateCompleted', (programName) => {
  // Wait for update to complete
  cy.get('ul.MuiList-root li div[role="progressbar"]').should('exist')
  cy.get('ul.MuiList-root li div[role="progressbar"]').should('not.exist')

  // Check last journal message
  cy.get('ul.MuiList-root li').first().click()
  cy.contains('Update program').should('exist')
  cy.contains('Failed to update').should('not.exist')
})

Cypress.Commands.add(
  'checkProgramFieldValues',
  (
    programCode,
    programName,
    maxBeneficiaries,
    programType,
    institution='',
    description='',
  ) => {
  cy.assertMuiInput('Code', programCode)
  cy.assertMuiInput('Name', programName)
  const today = getTodayFormatted()
  cy.assertMuiInput('Date from', today)
  cy.assertMuiInput('Date to', today)
  cy.assertMuiInput('Max Beneficiaries', maxBeneficiaries)
  cy.assertMuiInput('Institution', institution)
  cy.assertMuiInput('Description', description, 'textarea')
})

Cypress.Commands.add(
  'checkProgramFieldValuesInListView',
  (programCode, programName, maxBeneficiaries, programType) => {

  cy.contains('tfoot', 'Rows Per Page')
  cy.contains('td', programName).should('exist')
  cy.contains('td', programName)
    .parent('tr').within(() => {
      cy.contains('td', programCode)
      cy.contains('td', programType)
      cy.contains('td', maxBeneficiaries)
      cy.contains('td', new Date().toISOString().substring(0, 10))
    })
})

Cypress.Commands.add('uploadIndividualsCSV', (numIndividuals) => {
  cy.task('updateCSV', { numIndividuals }).then(() => {
    cy.contains('li', 'UPLOAD').click()

    cy.get('input[type="file"]').attachFile('tmp_individuals.csv');

    cy.chooseMuiSelect('Workflow', 'Python Import Individuals')
    cy.contains('button', 'Upload Individuals').click();

    cy.contains('button', 'Upload Individuals').should('not.exist')
    cy.contains('button', 'Uploading...').should('be.disabled')
  })
})

Cypress.Commands.add('ensureSufficientIndividuals', (expectedNumIndividuals) => {
  cy.visit('/front/individuals')
  cy.getItemCount('Individual').then(count => {
    const numToAdd = expectedNumIndividuals - count;
    if (numToAdd <= 0) {
      Cypress.log({
        name: 'ensureSufficientIndividuals',
        message: `Found ${count} which is more than ${expectedNumIndividuals}, no need to add additional`,
      });
      return
    }

    cy.visit('/front/individuals')
    cy.uploadIndividualsCSV(numToAdd)

    cy.wait(100*numToAdd) // group creation takes time

    cy.visit('/front/individuals')
    cy.getItemCount("Individual").then(newCount => {
      expect(newCount).to.be.gte(expectedNumIndividuals);
    });
  })
})

Cypress.Commands.add('ensureSufficientHouseholds', (expectedNumGroups) => {
  cy.visit('/front/groups')
  cy.getItemCount('Group').then(numGroups => {
    const numGroupsToAdd = expectedNumGroups - numGroups;
    if (numGroupsToAdd <= 0) {
      Cypress.log({
        name: 'ensureSufficientHouseholds',
        message: `Found ${numGroups} which is more than ${expectedNumGroups}, no need to add additional`,
      });
      return
    }

    const numIndividualsToAdd = numGroupsToAdd * 5
    cy.visit('/front/individuals')
    cy.uploadIndividualsCSV(numIndividualsToAdd)

    cy.wait(100*numIndividualsToAdd) // group creation takes time

    cy.visit('/front/groups')
    cy.getItemCount("Group").then(newCount => {
      expect(newCount).to.be.gte(expectedNumGroups);
    });
  })
})

Cypress.Commands.add('ensurePermissiveTaskGroup', () => {
  cy.visit('/front/tasks/groups');

  cy.contains('Task Groups Found')
  cy.get('table').then(($table) => {
    const hasAnyRow = $table.find('tbody tr td:first-child')
      .toArray()
      .some((td) => td.innerText.trim() === 'any');

    if (!hasAnyRow) {
      cy.get('[title="Create"] button').click();

      cy.enterMuiInput('Code', 'any');
      cy.chooseMuiSelect('Policy Status', 'ANY');
      cy.chooseMuiAutocomplete('Task Executors', 'Admin Admin');

      cy.get('[title="Save changes"] button').click();

      // Wait for creation to complete
      cy.get('ul.MuiList-root li div[role="progressbar"]').should('exist');

      // Verify creation in expanded journal drawer
      cy.get('.MuiDrawer-paperAnchorRight button').first().click();

      cy.get('ul.MuiList-root li').first().should('contain', 'Create task group');
    } else {
      cy.log('Permissive task group named any already exists — skipping creation.');
    }
  });
});

Cypress.Commands.add('configureDefaultEnrollmentCriteria', (
  programName, status, criterionField, criterionFilter, criterionValue,
) => {
  cy.visit('/front/benefitPlans');
  cy.openProgramForEditFromList(programName)

  cy.contains('button', 'Beneficiaries').click()
  cy.contains('button', status).click()

  cy.contains(`${status} Beneficiary Enrollment Criteria`)
  cy.contains('button', 'Add Filters').click()

  cy.chooseMuiSelect('Field', criterionField)
  cy.chooseMuiSelect('Confirm Filters', criterionFilter)

  const isValueSelect = /^(True|False)$/.test(criterionValue);
  isValueSelect
    ? cy.chooseMuiSelect('Value', criterionValue)
    : cy.enterMuiInput('Value', criterionValue);

  cy.get('[title="Save changes"] button').click()

  cy.checkProgramUpdateCompleted()
  cy.reload()

  cy.contains('button', 'Beneficiaries').click()
  cy.contains('button', status).click()

  cy.assertMuiSelectValue('Field', criterionField);
  cy.assertMuiSelectValue('Confirm Filters', criterionFilter);
  isValueSelect
    ? cy.assertMuiSelectValue('Value', criterionValue)
    : cy.assertMuiInput('Value', criterionValue);
});

Cypress.Commands.add('enrollBeneficiariesIntoProgram', (
  programName,
  programCode,
  status, // Active, Potential etc.
  criterionField,
  criterionFilter,
  criterionValue,
  entityName,
) => {
  cy.chooseMuiAutocomplete('Program', programName)
  cy.chooseMuiSelect('Status', status.toUpperCase())

  cy.assertMuiSelectValue('Field', criterionField);
  cy.assertMuiSelectValue('Confirm Filters', criterionFilter);
  /^(True|False)$/.test(criterionValue)
    ? cy.assertMuiSelectValue('Value', criterionValue)
    : cy.assertMuiInput('Value', criterionValue);

  cy.contains('button', 'Preview Enrollment Process').click()

  cy.contains('h6', `Number Of Selected ${entityName}`)
    .next('p')
    .invoke('text')
    .then((text) => {
      const num = Number(text.trim());
      cy.wrap(num).as('numEnrolled');
      expect(num).to.be.greaterThan(0);
    });

  cy.contains('button', 'Confirm Enrollment Process').click()

  // confirmation dialog
  cy.contains('h2', 'Confirm Enrollment Process')
  cy.contains('button', 'Ok').click()

  // The enrollment page doesn't trigger journal update correctly
  // so we'd have to reload the page here
  cy.reload()

  // Verify enrollment in expanded journal drawer
  cy.get('.MuiDrawer-paperAnchorRight button')
    .first()
    .click();

  cy.get('ul.MuiList-root li')
    .first()
    .should('contain', 'Enrollment has been confirmed');

  // maker-checker approves enrollment
  cy.ensurePermissiveTaskGroup()
  cy.visit('/front/AllTasks')
  cy.contains('tfoot', 'Rows Per Page')
  cy.get('tr')
    .filter((_, tr) => (
      Cypress.$(tr).find('td:contains("import_valid_items")').length > 0 &&
      Cypress.$(tr).find('td:contains("RECEIVED")').length > 0
    ))
    .first()
    .within(() => {
      cy.get('td')
        .contains(new RegExp(`^${programCode}\\b`))
        .should('exist');

      cy.get('button[title="View details"]').click();
    });

  cy.contains('Import Valid Items Task')
  cy.chooseMuiAutocomplete('Task Group', 'any');
  cy.get('[title="Save changes"] button').click();

  cy.contains('div', 'Accept All')
    .find('button')
    .click();

  cy.contains('Beneficiary Upload Confirmation')
  cy.contains('button', 'Continue').click()
  cy.contains('div', 'Accept All')
    .find('button').should('be.disabled')

  cy.visit('/front/AllTasks')
  cy.get('tr')
    .filter((_, tr) => (
      Cypress.$(tr).find('td:contains("import_valid_items")').length > 0 &&
      Cypress.$(tr).find(`td:contains("${programCode}")`).length > 0
    ))
    .first()
    .within(() => {
      cy.contains('td', 'COMPLETED')
    });

  cy.visit('/front/benefitPlans');
  cy.openProgramForEditFromList(programName)
  cy.contains('button', 'Beneficiaries').click()
  cy.contains('button', status).click()

  cy.get('@numEnrolled').then((count) => {
    if (entityName === 'Groups') {
      cy.contains(`${count} Group Beneficiaries`)
    } else {
      cy.contains(`${count} Beneficiaries`)
    }
  });
})

Cypress.Commands.add('enrollIndividualBeneficiariesIntoProgram', (
  programName,
  programCode,
  status,
  criterionField,
  criterionFilter,
  criterionValue,
) => {
  cy.ensureSufficientIndividuals(100)

  cy.visit('/front/individuals')
  cy.contains('a', 'ENROLLMENT').click()

  cy.enrollBeneficiariesIntoProgram(
    programName, programCode, status,
    criterionField, criterionFilter, criterionValue, 'Individuals'
  )
})

Cypress.Commands.add('enrollGroupBeneficiariesIntoProgram', (
  programName,
  programCode,
  status,
  criterionField,
  criterionFilter,
  criterionValue,
) => {
  cy.ensureSufficientHouseholds(20)

  cy.visit('/front/groups')
  cy.contains('a', 'ENROLLMENT').click()

  cy.enrollBeneficiariesIntoProgram(
    programName, programCode, status,
    criterionField, criterionFilter, criterionValue, 'Groups'
  )
})


Cypress.Commands.add('enterMuiInput', (label, value, inputTag='input') => {
  cy.contains('label', label)
    .siblings('.MuiInputBase-root')
    .find(inputTag)
    .first()
    .clear({force: true})
    .type(value, {force: true});
})

Cypress.Commands.add('chooseMuiSelect', (label, value) => {
  cy.contains('label', label)
    .siblings('.MuiInputBase-root')
    .find('[role="button"]')
    .click()

  cy.contains('[role="listbox"] li', value).as('option')
  cy.get('@option').click()
})

Cypress.Commands.add('assertMuiInput', (label, value, inputTag='input') => {
  cy.contains('label', label)
    .siblings('.MuiInputBase-root')
    .find(inputTag)
    .should('be.visible')
    .and('have.value', value);
})

Cypress.Commands.add('assertMuiInputDisabled', (label, value=null, inputTag='input') => {
  const input = cy.contains('label', label)
    .siblings('.MuiInputBase-root')
    .find(inputTag)
  input.should('be.disabled');

  if (value) {
    input.should('have.value', value)
  }
})

Cypress.Commands.add('assertMuiSelectValue', (label, value) => {
  cy.contains('label', label)
    .siblings('.MuiInputBase-root')
    .contains(value)
})

Cypress.Commands.add('chooseMuiAutocomplete', (label, value) => {
  cy.contains('label', label)
    .siblings('.MuiInputBase-root')
    .find('input')
    .click()

  cy.contains('[role="menu"] li, [role="presentation"] li', value).click();
})

Cypress.Commands.add('setModuleConfig', (moduleName, configFixtureFile) => {
    cy.deleteModuleConfig(moduleName)

    cy.contains('a', 'Module configurations').click()

    // Create module config using fixture config file
    cy.contains('a', 'Add module configuration').click()
    cy.get('input[name="module"]').type(moduleName)
    cy.get('select[name="layer"]').select('backend')
    cy.get('input[name="version"]').type(1)

    cy.fixture(configFixtureFile).then((config) => {
      const configString = JSON.stringify(config, null, 2);
      cy.get('textarea[name="config"]')
        .type(configString, {
          parseSpecialCharSequences: false,
          delay: 0  // Type faster
        });

      cy.get('input[value="Save"]').click()
      cy.contains("was added successfully")
    })
})

Cypress.Commands.add('getItemCount', (itemName) => {
  const pattern = new RegExp(`\\d+ ${itemName}s? Found`);
  return cy.contains(pattern)
    .invoke('text')
    .then((text) => {
      const match = text.match(new RegExp(`(\\d+)\\s+${itemName}`));
      return parseInt(match?.[1], 10);
    });
});


import { 
  fillFamilyForm, 
  fillInsureeForm, 
  clickCreateInsuree,
  clickSave,
  goToFamiliesPage,
  goToFamilyForm,
  goToInsureesPage,
  verifyFamilyExists,
  verifyInsureeExists,
  goToFamilyOverview,
  selectSearcherRow,
  addExistingInsureeIntoFamily
} from '../e2e/insuree.cy';

Cypress.Commands.add('fillFamilyForm', fillFamilyForm);
Cypress.Commands.add('fillInsureeForm', fillInsureeForm);
Cypress.Commands.add('clickCreateInsuree', clickCreateInsuree);
Cypress.Commands.add('clickSave', clickSave);
Cypress.Commands.add('goToFamiliesPage', goToFamiliesPage);
Cypress.Commands.add('goToFamilyForm', goToFamilyForm);
Cypress.Commands.add('goToInsureesPage', goToInsureesPage);
Cypress.Commands.add('verifyFamilyExists', verifyFamilyExists);
Cypress.Commands.add('verifyInsureeExists', verifyInsureeExists);
Cypress.Commands.add('goToFamilyOverview', goToFamilyOverview);
Cypress.Commands.add('selectSearcherRow', selectSearcherRow);
Cypress.Commands.add('addExistingInsureeIntoFamily', addExistingInsureeIntoFamily);
