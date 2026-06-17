// Generic form-action helpers shared across the suite.
//
// These commands replace the hand-rolled save/progressbar/journal patterns
// that appeared in payment-plan.commands.js, programs.commands.js, etc.

import { TIMEOUTS } from '../constants';

// The "Save" FAB uses one of three known tooltip titles depending on the
// form and its state.  Listed most-specific first.
const KNOWN_SAVE_TITLES = [
  'Save changes',
  'Save',
  'Please fill General Information fields first',
];

export function registerFormCommands() {
  // Wait for the journal-progress indicator to appear and then disappear.
  // This is the "async mutation finished" signal used throughout the app.
  Cypress.Commands.add('waitForJournalProgress', () => {
    cy.get('ul.MuiList-root li div[role="progressbar"]', { timeout: TIMEOUTS.BACKEND_VALIDATION })
      .should('exist');
    cy.get('ul.MuiList-root li div[role="progressbar"]').should('not.exist');
  });

  // Open the journal drawer (if not already open) and assert its first entry.
  Cypress.Commands.add('assertJournalFirstEntryContains', (text) => {
    cy.get('.MuiDrawer-paperAnchorRight button').first().click();
    cy.get('ul.MuiList-root li').first().should('contain', text);
  });

  // Assert that the first journal entry does NOT contain the given prefix.
  // Typical use: assertJournalNoFail('Failed to create').
  Cypress.Commands.add('assertJournalNoFail', (prefix = 'Failed to') => {
    cy.get('ul.MuiList-root li').first().should('not.contain', prefix);
  });

  Cypress.Commands.add('clickCreate', (createTitle = 'Create') => {
    cy.get(`[title="${createTitle}"] button`, { timeout: TIMEOUTS.BACKEND_VALIDATION })
      .should('not.be.disabled')
      .click();
  });

  // Click the Save FAB.  Tries each known tooltip title (most-specific
  // first) and clicks the first non-disabled match.  Pass an explicit
  // title string to scope to a single candidate.
  Cypress.Commands.add('clickSave', (saveTitle) => {
    const titles = saveTitle ? [saveTitle] : KNOWN_SAVE_TITLES;
    cy.get('body', { timeout: TIMEOUTS.BACKEND_VALIDATION }).should(($body) => {
      const hit = titles.find((t) => $body.find(`[title="${t}"] button`).length);
      expect(
        hit,
        `clickSave: no Save FAB found with any known title (${titles.join(', ')})`,
      ).to.exist;
    }).then(($body) => {
      const hit = titles.find((t) => $body.find(`[title="${t}"] button`).length);
      cy.get(`[title="${hit}"] button`, { timeout: TIMEOUTS.BACKEND_VALIDATION })
        .should('not.be.disabled')
        .click();
    });
  });

  // Click the Save FAB and wait for the async journal to finish.
  //
  // Options:
  //   saveTitle    — exact `[title="..."]` of the Save FAB.  When omitted
  //                  the helper tries KNOWN_SAVE_TITLES in order.
  //   mutationLabel — if set, asserts the first journal entry contains this text
  //   assertNoFail — if set, asserts the first journal entry doesn't start with 'Failed to'
  Cypress.Commands.add('saveAndAwaitJournal', ({
    saveTitle,
    mutationLabel,
    assertNoFail = false,
  } = {}) => {
    cy.clickSave(saveTitle);
    cy.waitForJournalProgress();
    if (mutationLabel || assertNoFail) {
      cy.assertJournalFirstEntryContains(mutationLabel || '');
      if (assertNoFail) {
        cy.assertJournalNoFail('Failed to');
      }
    }
  });

  // Assert the Save FAB.  Tries each known tooltip title; passes
  // if any of them matches.  Optionally scope to a specific title.
  Cypress.Commands.add('assertSave', (enabled = true, tooltipText) => {
    const titles = tooltipText ? [tooltipText] : KNOWN_SAVE_TITLES;
    cy.get('body').then(($body) => {
      const hit = titles.find((t) => $body.find(`[title="${t}"] button`).length);
      if (!hit) {
        throw new Error(
          `assertSave: no Save FAB found with any known title (${titles.join(', ')})`,
        );
      }
      const assertion = enabled ? 'not.be.disabled' : 'be.disabled';
      cy.get(`[title="${hit}"] button`).should(assertion);
    });
  });

  Cypress.Commands.add('assertSaveDisabled', (tooltipText) => {
    cy.assertSave(false, tooltipText);
  });

  Cypress.Commands.add('assertSaveEnabled', (tooltipText) => {
    cy.assertSave(true, tooltipText);
  });
}
