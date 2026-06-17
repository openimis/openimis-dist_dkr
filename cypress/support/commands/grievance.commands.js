export function registerGrievanceCommands() {
  Cypress.Commands.add('getGrievanceCount', () => {
    const pattern = /\(\d+\) Grievance\(s\)/;
    return cy.contains(pattern)
      .invoke('text')
      .then((text) => {
        const match = text.match(/\((\d+)\) Grievance/);
        return parseInt(match?.[1], 10);
      });
  });

  Cypress.Commands.add('createGrievance', (grievanceData) => {
    cy.visit('/front/ticket/newTicket');

    // Required fields
    cy.enterMuiInput('Grievance Title', grievanceData.title);
    cy.chooseMuiAutocomplete('Category', grievanceData.category);
    cy.chooseMuiAutocomplete('Flag', grievanceData.flag);
    cy.chooseMuiAutocomplete('Channel', grievanceData.channel);

    // Optional fields
    if (grievanceData.priority) {
      cy.chooseMuiSelect('Priority', grievanceData.priority);
    }

    if (grievanceData.dateOfIncident) {
      cy.contains('label', 'Date Of Incident')
        .parent()
        .find('input')
        .type(grievanceData.dateOfIncident);
    }

    if (grievanceData.assignedUser) {
      cy.chooseMuiAutocomplete('Assigned User', grievanceData.assignedUser);
    }

    if (grievanceData.details) {
      cy.enterMuiInput('DETAILS OF EVENT', grievanceData.details);
    }

    // Reporter type handling
    if (grievanceData.reporterType) {
      cy.chooseMuiSelect('Reporter Type', grievanceData.reporterType);

      if (grievanceData.reporterType === 'Individual') {
        if (grievanceData.benefitPlan) {
          cy.chooseMuiAutocomplete('Program', grievanceData.benefitPlan);
        }
        if (grievanceData.individual) {
          cy.chooseMuiAutocomplete('Individual', grievanceData.individual);
        } else {
          cy.chooseMuiAutocomplete('Individual');
        }
      } else if (grievanceData.reporterType === 'Beneficiary') {
        if (grievanceData.benefitPlan) {
          cy.chooseMuiAutocomplete('Program', grievanceData.benefitPlan);
        }
        if (grievanceData.beneficiary) {
          cy.chooseMuiAutocomplete('BeneficiaryPicker', grievanceData.beneficiary);
        } else {
          cy.chooseMuiAutocomplete('BeneficiaryPicker');
        }
      } else if (grievanceData.reporterType === 'Attending Staff') {
        if (grievanceData.attendingStaff) {
          cy.chooseMuiAutocomplete('Complainant', grievanceData.attendingStaff);
        } else {
          cy.chooseMuiAutocomplete('Complainant');
        }
      }
    }

    // Save the grievance
    cy.get('label[role="button"].MuiIconButton-colorPrimary').click();

    // Wait for creation to complete
    cy.get('ul.MuiList-root li div[role="progressbar"]', { timeout: 15000 }).should('exist');
    cy.get('ul.MuiList-root li div[role="progressbar"]', { timeout: 15000 }).should('not.exist');

    // Check journal for success
    cy.get('ul.MuiList-root li').first().click();
    cy.contains(`Created Ticket ${grievanceData.title}`).should('exist');
    cy.contains('Failed to create').should('not.exist');
  });

  Cypress.Commands.add('updateGrievance', (grievanceCode, updateData, immutableFields = {}) => {
    cy.visit('/front/ticket/tickets');
    cy.contains('tfoot', 'Rows Per Page').should('be.visible');

    // Search for grievance by code
    cy.enterMuiInput('Code', grievanceCode);
    cy.contains('button', 'Search').click();
    cy.contains('tfoot', 'Rows Per Page').should('be.visible');

    // Open grievance for edit
    cy.contains('td', grievanceCode)
      .parent('tr')
      .within(() => {
        cy.get('button[title="Edit"]').click();
      });

    if (immutableFields.reporterType) {
      cy.assertMuiInputDisabled('Reporter Type', immutableFields.reporterType);
    }

    if (immutableFields.reporterFieldLabel) {
      cy.get('body').then(($body) => {
        const labelText = immutableFields.reporterFieldLabel;
        const hasLabel = $body.find('label').toArray()
          .some((el) => el.textContent?.trim() === labelText);
        if (hasLabel) {
          cy.assertMuiInputDisabled(
            labelText,
            immutableFields.reporterFieldValue ?? null,
          );
        }
      });
    }

    // Update fields (excluding reporter type and reporter info)
    if (updateData.title) {
      cy.enterMuiInput('Title', updateData.title);
    }

    if (updateData.category) {
      cy.chooseMuiAutocomplete('Category', updateData.category);
    }

    if (updateData.flag) {
      cy.chooseMuiAutocomplete('Flag', updateData.flag);
    }

    if (updateData.channel) {
      cy.chooseMuiAutocomplete('Channel', updateData.channel);
    }

    if (updateData.priority) {
      cy.chooseMuiSelect('Priority', updateData.priority);
    }

    if (updateData.details) {
      cy.enterMuiInput('Description', updateData.details);
    }

    // Save changes
    cy.get('label[role="button"].MuiIconButton-colorPrimary').click();

    // Wait for update to complete
    cy.get('ul.MuiList-root li div[role="progressbar"]', { timeout: 15000 }).should('exist');
    cy.get('ul.MuiList-root li div[role="progressbar"]', { timeout: 15000 }).should('not.exist');

    // Check journal for success
    cy.get('ul.MuiList-root li').first().click();
    cy.contains('updated ticket', { timeout: 10000 }).should('exist');
    cy.contains('Failed to update').should('not.exist');
  });

  Cypress.Commands.add('resolveGrievance', (grievanceCode, comment = 'Resolved Grievance') => {
    cy.searchAndOpenGrievanceForEdit(grievanceCode);
    cy.addGrievanceComment(comment);

    // Click the tick mark icon on the first/latest comment to resolve
    cy.get('button[title="Resolve grievance with this comment."]').first().click();

    // Wait for resolve to complete
    cy.get('ul.MuiList-root li div[role="progressbar"]', { timeout: 15000 }).should('exist');
    cy.get('ul.MuiList-root li div[role="progressbar"]', { timeout: 15000 }).should('not.exist');

    // Check journal for success
    cy.get('ul.MuiList-root li').first().click();
    cy.contains('Resolve Ticket using comment', { timeout: 10000 }).should('exist');
    cy.contains('Failed').should('not.exist');
  });

  Cypress.Commands.add('unlockGrievance', (grievanceCode) => {
    cy.searchAndOpenGrievanceForEdit(grievanceCode);

    // Click the unlock icon (lock icon in header action area)
    cy.get('div[class*="paperHeaderAction"] button.MuiIconButton-root').click();

    cy.get('ul.MuiList-root li div[role="progressbar"]', { timeout: 15000 }).should('exist');
    cy.get('ul.MuiList-root li div[role="progressbar"]', { timeout: 15000 }).should('not.exist');

    cy.get('ul.MuiList-root li').first().click();
    cy.contains('Failed').should('not.exist');
  });

  Cypress.Commands.add('checkGrievanceFieldValues', (title, category, flag, channel, priority = null, details = null) => {
    cy.assertMuiInput('Grievance Title', title);
    cy.assertMuiInput('Category', category);
    cy.assertMuiInput('Flag', flag);
    cy.assertMuiInput('Channel', channel);
    if (priority) {
      cy.assertMuiSelectValue('Priority', priority);
    }

    if (details) {
      cy.assertMuiInput('Description', details);
    }
  });

  Cypress.Commands.add('checkGrievanceFieldValuesInListView', (title, category) => {
    cy.contains('tfoot', 'Rows Per Page').should('be.visible');

    cy.enterMuiInput('Title', title);
    cy.contains('button', 'Search').click();
    cy.contains('tfoot', 'Rows Per Page').should('be.visible');

    cy.contains('td', title).should('exist');
    cy.contains('td', title)
      .parent('tr')
      .within(() => {
        cy.contains('td', category).should('exist');
      });
  });

  Cypress.Commands.add('getGrievanceCodeFromList', (title) => {
    cy.visit('/front/ticket/tickets');
    cy.contains('tfoot', 'Rows Per Page').should('be.visible');

    cy.enterMuiInput('Title', title);
    cy.contains('button', 'Search').click();
    cy.contains('tfoot', 'Rows Per Page').should('be.visible');

    return cy.contains('td', title)
      .parent('tr')
      .find('td')
      .first()
      .invoke('text')
      .then((code) => code.trim());
  });

  Cypress.Commands.add('searchAndOpenGrievanceForEdit', (grievanceCode) => {
    cy.visit('/front/ticket/tickets');
    cy.contains('tfoot', 'Rows Per Page').should('be.visible');

    cy.enterMuiInput('Code', grievanceCode);
    cy.contains('button', 'Search').click();
    cy.contains('tfoot', 'Rows Per Page').should('be.visible');

    cy.contains('td', grievanceCode)
      .parent('tr')
      .within(() => {
        cy.get('button[title="Edit"]').click();
      });
  });

  Cypress.Commands.add('addGrievanceComment', (commentText, commentData = {}) => {
    cy.contains('button', 'Add Comment').click();
    // Use native HTMLInputElement value setter to avoid DOM detachment caused by
    // React's per-keystroke re-renders in TicketCommentsPanel (setInterval + controlled input).
    cy.contains('label', 'Comment')
      .siblings('.MuiInputBase-root')
      .find('input')
      .first()
      .then(($input) => {
        const inputEl = $input[0];
        const win = inputEl.ownerDocument.defaultView || window;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          win.HTMLInputElement.prototype, 'value',
        ).set;
        nativeInputValueSetter.call(inputEl, commentText);
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      });

    if (commentData.reporterType) {
      cy.chooseMuiSelect('Reporter Type', commentData.reporterType);

      if (commentData.reporterType === 'Individual') {
        if (commentData.benefitPlan) {
          cy.chooseMuiAutocomplete('Program', commentData.benefitPlan);
        }
        if (commentData.individual) {
          cy.chooseMuiAutocomplete('Individual', commentData.individual);
        } else {
          cy.chooseMuiAutocomplete('Individual');
        }
      } else if (commentData.reporterType === 'Beneficiary') {
        if (commentData.benefitPlan) {
          cy.chooseMuiAutocomplete('Program', commentData.benefitPlan);
        }
        if (commentData.beneficiary) {
          cy.chooseMuiAutocomplete('Beneficiary', commentData.beneficiary);
        } else {
          cy.chooseMuiAutocomplete('Beneficiary');
        }
      } else if (commentData.reporterType === 'Attending Staff') {
        if (commentData.attendingStaff) {
          cy.chooseMuiAutocomplete('Commenter', commentData.attendingStaff);
        } else {
          cy.chooseMuiAutocomplete('Commenter');
        }
      }
    }

    cy.contains('button', 'Save').click();

    // Wait for save mutation to complete before reloading
    cy.get('ul.MuiList-root li div[role="progressbar"]', { timeout: 15000 }).should('exist');
    cy.get('ul.MuiList-root li div[role="progressbar"]', { timeout: 15000 }).should('not.exist');

    cy.contains(commentText).should('exist');
  });
}
