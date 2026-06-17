import { getTodayFormatted } from '../helpers/date';
import { TIMEOUTS } from '../constants';

export function registerProgramCommands() {
  Cypress.Commands.add('deleteProject', (projectPath) => {
    cy.visit(projectPath);
    cy.get('button[title="Delete"]').click();
    cy.contains('button', 'Ok').click();

    // Check redirect
    cy.location('pathname').should('not.include', projectPath);

    // Check last journal message
    cy.get('ul.MuiList-root li').first().click();
    cy.contains('Delete project').should('exist');
    cy.contains('Failed to delete').should('not.exist');
  });

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
    cy.openProgramForEditFromList(programName);
    cy.contains('button', 'Projects').click();
    cy.contains('button', 'Create Project').click();
    cy.contains('h6', 'Project details');

    cy.enterMuiInput('Name', projectName);

    cy.chooseMuiAutocomplete('Activity', activityName);

    cy.chooseMuiAutocomplete('Location', regionName);
    if (districtName) {
      cy.contains('li', districtName).click();
    }

    cy.enterMuiInput('Target Beneficiaries', targetBeneficiaries);

    cy.enterMuiInput('Working Days', workingDays);

    // Allow same beneficiary in multiple projects (avoids conflicts across E2E runs).
    cy.chooseMuiSelect('Allow beneficiaries to enroll in multiple projects', 'Yes');

    cy.saveAndAwaitJournal({
      saveTitle: 'Save',
      mutationLabel: `Create project ${projectName}`,
      assertNoFail: true,
    });
  });

  Cypress.Commands.add('deleteProgram', (programName) => {
    cy.visit('/front/benefitPlans');
    cy.contains('tfoot', 'Rows Per Page').should('be.visible');

    cy.get('body').then(($body) => {
      const programRows = $body.find(`td:contains("${programName}")`).closest('tr');

      if (programRows.length > 0) {
        cy.log(`Found ${programRows.length} program(s) to delete`);

        programRows.each((_, row) => {
          cy.wrap(row).within(() => {
            // Find and click the Delete button in this row
            cy.get('button[title="Delete"]')
              .click({ force: true });
          });

          // Confirm deletion in dialog
          cy.contains('button', 'Ok')
            .should('be.visible')
            .click();

          // Wait for deletion to complete
          cy.get('ul.MuiList-root li div[role="progressbar"]').should('exist');

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

  Cypress.Commands.add('createProgram', (programCode, programName, maxBeneficiaries, programType, schema) => {
    cy.visit('/front/benefitPlans');
    cy.get('[title="Create"] button').click();

    cy.enterMuiInput('Code', programCode);

    cy.enterMuiInput('Name', programName);

    cy.contains('label', 'Date from')
      .parent()
      .click();
    cy.contains('button', 'OK')
      .click();

    cy.contains('label', 'Date to')
      .parent()
      .click();
    cy.contains('button', 'OK')
      .click();

    cy.enterMuiInput('Max Beneficiaries', maxBeneficiaries);

    cy.contains('label', 'Type')
      .parent()
      .click();
    cy.contains('li[role="option"]', programType)
      .click();

    if (schema) {
      const schemaStr = typeof schema === 'string' ? schema : JSON.stringify(schema);
      // MUI multiline TextField renders a visible textarea + a hidden shadow textarea.
      // Target the visible one (without aria-hidden) inside the Schema field.
      cy.contains('label', 'Schema')
        .siblings('.MuiInputBase-root')
        .find('textarea:not([aria-hidden="true"])')
        .clear({ force: true })
        .type(schemaStr, { parseSpecialCharSequences: false, delay: 0, force: true });
      cy.contains('label', 'Schema')
        .siblings('.MuiInputBase-root')
        .find('.MuiInputAdornment-root svg', { timeout: TIMEOUTS.BACKEND_VALIDATION })
        .should('exist');
      cy.contains('label', 'Schema')
        .siblings('.MuiInputBase-root')
        .find('.MuiInputAdornment-root')
        .should('have.attr', 'class')
        .and('match', /validIcon/)
        .and('not.match', /invalidIcon|pendingIcon/);
    }

    cy.saveAndAwaitJournal({
      saveTitle: 'Save changes',
      mutationLabel: 'Create program',
      assertNoFail: true,
    });
  });

  Cypress.Commands.add('openProgramForEditFromList', (programName) => {
    cy.contains('tfoot', 'Rows Per Page', { timeout: TIMEOUTS.BACKEND_VALIDATION });
    // Search by name to ensure the program is visible regardless of pagination.
    cy.enterMuiInput('Name', programName);
    cy.contains('button', 'Search').click();
    cy.contains('td', programName, { timeout: TIMEOUTS.BACKEND_VALIDATION })
      .parent('tr').within(() => {
        // click on edit button
        cy.get('a.MuiIconButton-root').click();
      });
    cy.assertMuiInput('Name', programName);
  });

  Cypress.Commands.add('checkProgramUpdateCompleted', () => {
    cy.waitForJournalProgress();
    cy.assertJournalFirstEntryContains('Update program');
    cy.assertJournalNoFail('Failed to update');
  });

  Cypress.Commands.add(
    'checkProgramFieldValues',
    (
      programCode,
      programName,
      maxBeneficiaries,
      programType,
      institution = '',
      description = '',
    ) => {
      cy.assertMuiInput('Code', programCode);
      cy.assertMuiInput('Name', programName);
      const today = getTodayFormatted();
      cy.assertMuiInput('Date from', today);
      cy.assertMuiInput('Date to', today);
      cy.assertMuiInput('Max Beneficiaries', maxBeneficiaries);
      cy.assertMuiInput('Institution', institution);
      cy.assertMuiInput('Description', description, 'textarea');
    },
  );

  Cypress.Commands.add(
    'checkProgramFieldValuesInListView',
    (programCode, programName, maxBeneficiaries, programType) => {
      cy.contains('tfoot', 'Rows Per Page');
      cy.contains('td', programName).should('exist');
      cy.contains('td', programName)
        .parent('tr').within(() => {
          cy.contains('td', programCode);
          cy.contains('td', programType);
          cy.contains('td', maxBeneficiaries);
          cy.contains('td', new Date().toISOString().substring(0, 10));
        });
    },
  );

  Cypress.Commands.add('configureDefaultEnrollmentCriteria', (
    programName, status, criterionField, criterionFilter, criterionValue,
  ) => {
    cy.visit('/front/benefitPlans');
    cy.openProgramForEditFromList(programName);

    cy.contains('button', 'Beneficiaries').click();
    cy.contains('button', status).click();

    cy.contains(`${status} Beneficiary Enrollment Criteria`);
    cy.contains('button', 'Add Filters').click();

    cy.chooseMuiSelect('Field', criterionField);
    cy.chooseMuiSelect('Confirm Filters', criterionFilter);

    const isValueSelect = /^(True|False)$/.test(criterionValue);
    isValueSelect
      ? cy.chooseMuiSelect('Value', criterionValue)
      : cy.enterMuiInput('Value', criterionValue);

    cy.get('[title="Save changes"] button').click();

    cy.checkProgramUpdateCompleted();
    cy.reload();

    cy.contains('button', 'Beneficiaries').click();
    cy.contains('button', status).click();

    cy.assertMuiSelectValue('Field', criterionField);
    cy.assertMuiSelectValue('Confirm Filters', criterionFilter);
    isValueSelect
      ? cy.assertMuiSelectValue('Value', criterionValue)
      : cy.assertMuiInput('Value', criterionValue);
  });

  Cypress.Commands.add('enrollBeneficiariesIntoProgram', (
    programName,
    programCode,
    status,
    criterionField,
    criterionFilter,
    criterionValue,
    entityName,
  ) => {
    cy.chooseMuiAutocomplete('Program', programName);
    cy.chooseMuiSelect('Status', status.toUpperCase());

    cy.assertMuiSelectValue('Field', criterionField);
    cy.assertMuiSelectValue('Confirm Filters', criterionFilter);
    /^(True|False)$/.test(criterionValue)
      ? cy.assertMuiSelectValue('Value', criterionValue)
      : cy.assertMuiInput('Value', criterionValue);

    cy.contains('button', 'Preview Enrollment Process').click();

    cy.contains('h6', `Number Of Selected ${entityName}`)
      .next('p')
      .invoke('text')
      .then((text) => {
        const num = Number(text.trim());
        cy.wrap(num).as('numEnrolled');
        expect(num).to.be.greaterThan(0);
      });

    cy.contains('button', 'Confirm Enrollment Process').click();

    // confirmation dialog
    cy.contains('h2', 'Confirm Enrollment Process');
    cy.contains('button', 'Ok').click();

    // The enrollment page doesn't trigger journal update correctly
    // so we'd have to reload the page here
    cy.reload();

    // Verify enrollment in expanded journal drawer
    cy.get('.MuiDrawer-paperAnchorRight button')
      .first()
      .click();

    cy.get('ul.MuiList-root li')
      .first()
      .should('contain', 'Enrollment has been confirmed');

    // maker-checker approves enrollment
    cy.ensurePermissiveTaskGroup();
    cy.visit('/front/AllTasks');
    cy.contains('tfoot', 'Rows Per Page');

    cy.aliasGraphqlQuery('task(id:', 'importTaskDetail');

    cy.get('tr')
      .filter((_, tr) => (
        Cypress.$(tr).find('td:contains("import_valid_items")').length > 0
        && Cypress.$(tr).find('td:contains("RECEIVED")').length > 0
      ))
      .first()
      .within(() => {
        cy.get('td')
          .contains(new RegExp(`^${programCode}\\b`))
          .should('exist');

        cy.get('button[title="View details"]').click();
      });

    cy.url({ timeout: TIMEOUTS.BACKEND_VALIDATION }).should('include', '/tasks/task/');
    cy.awaitSearcherRefresh('importTaskDetail');
    cy.contains('Import Valid Items Task', { timeout: TIMEOUTS.BACKEND_VALIDATION });
    cy.chooseMuiAutocomplete('Task Group', 'any');
    cy.get('[title="Save changes"] button').click();

    cy.contains('div', 'Accept All')
      .find('button')
      .click();

    cy.contains('Beneficiary Upload Confirmation');
    cy.contains('button', 'Continue').click();
    cy.contains('div', 'Accept All')
      .find('button').should('be.disabled');

    cy.visit('/front/AllTasks');
    cy.get('tr')
      .filter((_, tr) => (
        Cypress.$(tr).find('td:contains("import_valid_items")').length > 0
        && Cypress.$(tr).find(`td:contains("${programCode}")`).length > 0
      ))
      .first()
      .within(() => {
        cy.contains('td', 'COMPLETED');
      });

    cy.visit('/front/benefitPlans');
    cy.openProgramForEditFromList(programName);
    cy.contains('button', 'Beneficiaries').click();
    cy.contains('button', status).click();
    // The beneficiary searcher may not auto-execute — click Search to load
    // results.  Alias the round-trip so the post-click count assertion
    // observes the REFRESHED title rather than the pre-search 0-count.
    const beneAlias = entityName === 'Groups' ? 'groupBeneficiary(' : 'beneficiary(';
    cy.aliasGraphqlQuery(beneAlias, 'beneficiarySearch');
    cy.contains('button', 'Search', { timeout: TIMEOUTS.BACKEND_VALIDATION }).click();
    cy.awaitSearcherRefresh('beneficiarySearch');

    cy.get('@numEnrolled').then((count) => {
      if (entityName === 'Groups') {
        cy.contains(`${count} Group Beneficiaries`, { timeout: 30000 });
      } else {
        cy.contains(`${count} Beneficiaries`, { timeout: 30000 });
      }
    });
  });

  Cypress.Commands.add('enrollIndividualBeneficiariesIntoProgram', (
    programName,
    programCode,
    status,
    criterionField,
    criterionFilter,
    criterionValue,
  ) => {
    cy.ensureSufficientIndividuals(120);

    cy.visit('/front/individuals');
    cy.contains('a', 'ENROLLMENT').click();

    cy.enrollBeneficiariesIntoProgram(
      programName, programCode, status,
      criterionField, criterionFilter, criterionValue, 'Individuals',
    );
  });

  Cypress.Commands.add('enrollGroupBeneficiariesIntoProgram', (
    programName,
    programCode,
    status,
    criterionField,
    criterionFilter,
    criterionValue,
  ) => {
    cy.ensureSufficientHouseholds(20);

    cy.visit('/front/groups');
    cy.contains('a', 'ENROLLMENT').click();

    cy.enrollBeneficiariesIntoProgram(
      programName, programCode, status,
      criterionField, criterionFilter, criterionValue, 'Groups',
    );
  });

  // Assign enrolled program beneficiaries to a project.
  // projectPath: the URL path to the project detail page (captured via cy.url()).
  Cypress.Commands.add('assignBeneficiariesToProject', (projectPath) => {
    cy.visit(projectPath);
    cy.contains('Beneficiaries Assigned', { timeout: 15000 });
    cy.contains('button', 'Assign Beneficiaries').click();
    cy.get('[role="progressbar"]').should('exist');
    cy.get('[role="progressbar"]').should('not.exist');

    cy.get('[role="dialog"]', { timeout: 15000 }).should('be.visible');

    // Bump the dialog's pagination to its largest option BEFORE select-all,
    // so every enrolled candidate is on the visible page and gets included.
    // Without this, select-all only checks the first page (default 10 rows),
    // leaving the rest unassigned and producing partial cohorts downstream.
    cy.get('[role="dialog"]').then(($dialog) => {
      const $select = $dialog.find('.MuiTablePagination-select').first();
      if ($select.length) {
        cy.wrap($select).click({ force: true });
        cy.get('[role="listbox"] li').last().click({ force: true });
      }
    });

    // Click the select-all checkbox in the table header.
    // Use first() — the dialog may render multiple header rows.
    cy.get('[role="dialog"] th input[type="checkbox"]').first().click({ force: true });
    // The Save button may be scrolled out of view when many rows are visible.
    cy.get('[role="dialog"]').contains('button', 'Save').click({ force: true });
    cy.get('[role="progressbar"]').should('exist');
    cy.get('[role="progressbar"]').should('not.exist');
  });

  // Read the names of beneficiaries currently assigned to a project, by
  // scraping the project's "Enter time" bulk-edit table.  This is the
  // ground truth for who's in the project — distinct from the enrolled set
  // (which may be larger if assignment dialog pagination clipped some).
  // Returns a string array of "First Last" names in row order.
  //
  // Cohort-driven tests should drive their day-pattern map from THIS list,
  // not from a beneficiary GraphQL probe — names from the probe may not
  // appear in the project table if assignment is partial.
  Cypress.Commands.add('getProjectAssignedBeneficiaryNames', (projectPath) => {
    cy.visit(projectPath);
    cy.contains('Beneficiaries Assigned', { timeout: 15000 });
    cy.contains('button', 'Enter time').click();

    // Set pageSize to max so we read every row.
    cy.get('body').then(($body) => {
      const $select = $body.find('.MuiTablePagination-select').first();
      if (!$select.length) return;
      cy.wrap($select).click({ force: true });
      cy.get('[role="listbox"] li').last().click({ force: true });
    });

    cy.get('table tbody tr', { timeout: 15000 }).should('have.length.at.least', 1);

    // Scope to the bulk-edit "Enter time" table specifically — anchor
    // via its unique "Work Day" inputs and walk up to the enclosing
    // <table>. Without this scoping, unrelated tables on the page (the
    // upper summary "Beneficiaries Assigned" table) get included and
    // each beneficiary appears twice in the returned name list.
    return cy.get('input[placeholder^="Work Day"]', { timeout: 15000 })
      .first()
      .closest('table')
      .find('tbody tr')
      .then(($rows) => {
      const names = $rows.toArray().map((tr) => {
        // Take the first TWO alphabetic-only tokens from the row's
        // innerText.  This survives table layouts where the name cells
        // may be preceded by a checkbox/select column or interleaved
        // with numeric cells (e.g. district code, day-percent values).
        const text = (tr.innerText || tr.textContent || '').trim();
        const tokens = text.split(/\s+/).filter((t) => /^[A-Za-z]+$/.test(t));
        return tokens.slice(0, 2).join(' ');
      }).filter((n) => n.split(/\s+/).length === 2);
      return cy.wrap(names);
    });
  });

  // Enter time entries for all enrolled beneficiaries on a project.
  // Fills every visible day cell with the given percentComplete value.
  Cypress.Commands.add('enterProjectTimeEntries', (projectPath, percentComplete) => {
    cy.visit(projectPath);
    cy.contains('Beneficiaries Assigned', { timeout: 15000 });
    cy.contains('button', 'Enter time').click();

    // Fill only the "Work Day" percentage inputs (not other numeric columns
    // like "Children" that also appear in bulk-edit mode).
    // PercentageEditField renders with placeholder="Work Day N".
    cy.get('table input[placeholder^="Work Day"]').its('length').then((count) => {
      for (let i = 0; i < count; i++) {
        cy.get('table input[placeholder^="Work Day"]').eq(i)
          .type(`{selectall}${String(percentComplete)}`, { force: true });
      }
    });

    // Save time entries — the same button toggles to "Save" in edit mode.
    cy.contains('button', 'Save').click();
    cy.get('[role="progressbar"]', { timeout: 15000 }).should('not.exist');
  });

  // Per-beneficiary variant of enterProjectTimeEntries.  Accepts a
  // `daysByText` map of `{ "<row identifier>": [percentDay1, percentDay2, …] }`
  // where the key is any text (e.g. full name "Andrew Walker") whose tokens
  // collectively appear within the row's innerText.  Tokens are matched
  // case-insensitively and may be in any order — robust to first/last names
  // rendered in separate <td> cells (where row.text() has no separator).
  Cypress.Commands.add('enterProjectTimeEntriesPerBeneficiary', (projectPath, daysByText) => {
    cy.visit(projectPath);
    cy.contains('Beneficiaries Assigned', { timeout: 15000 });
    cy.contains('button', 'Enter time').click();

    // The bulk-edit table paginates (default 10 per page).  The exact cohort
    // we want to address must all be on one page, so set pageSize as high as
    // the picker allows; if no large option exists this is a no-op.
    cy.get('body').then(($body) => {
      const $select = $body.find('.MuiTablePagination-select').first();
      if (!$select.length) return;
      cy.wrap($select).click({ force: true });
      cy.get('[role="listbox"] li')
        .last()
        .click({ force: true });
    });

    cy.get('table tbody tr', { timeout: 15000 }).should('have.length.at.least', 1);

    // Re-query row + input on every type to avoid detached-DOM errors when
    // the table re-renders between cell edits.  Slower but stable.
    Object.entries(daysByText).forEach(([key, dayPercents]) => {
      const tokens = key.split(/\s+/).filter(Boolean).map((t) => t.toLowerCase());
      dayPercents.forEach((percent, idx) => {
        cy.get('table tbody tr').then(($rows) => {
          const matched = $rows.toArray().find((tr) => {
            const text = (tr.innerText || tr.textContent || '').toLowerCase();
            return tokens.every((t) => text.includes(t));
          });
          if (!matched) {
            throw new Error(`enterProjectTimeEntriesPerBeneficiary: no row matched "${key}"`);
          }
          cy.wrap(matched)
            .find('input[placeholder^="Work Day"]')
            .eq(idx)
            .type(`{selectall}${String(percent)}`, { force: true });
        });
      });
    });

    cy.contains('button', 'Save').click();
    cy.waitForJournalProgress();
    cy.assertJournalNoFail();
  });

  // Change the status of a project (e.g. to COMPLETED).
  Cypress.Commands.add('updateProjectStatus', (projectPath, status) => {
    cy.visit(projectPath);
    cy.contains('Beneficiaries Assigned', { timeout: 15000 });
    cy.chooseMuiSelect('Status', status);

    cy.saveAndAwaitJournal({ saveTitle: 'Save' });
  });
}
