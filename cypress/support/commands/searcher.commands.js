// Generic helpers for the MUI table "Searcher" pattern used across the app.
//
// All commands target the standard layout: a filter card at the top with a
// "Reset" button, followed by a results table with an "X <Entity> Found" title.

import { TIMEOUTS } from '../constants';

function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function registerSearcherCommands() {
  // Alias the NEXT POST /api/graphql request whose body's `query` string
  // contains `queryFragment`.  Register BEFORE the UI action that triggers
  // the fetch (Search click, Reset click, or a debounced filter change).
  //
  // Use a short distinctive substring of the GraphQL query field name, e.g.
  // `payroll(`, `paymentCycle(`, `paymentPlan(`.  The pair of this helper
  // and `awaitSearcherRefresh` replaces the stale `cy.contains(/N X Found/)`
  // post-search wait — cy.contains matches the pre-search title instantly
  // because the swap window to "Results loading..." is too brief to catch
  // reliably.
  Cypress.Commands.add('aliasGraphqlQuery', (queryFragment, alias) => {
    cy.intercept('POST', '/api/graphql', (req) => {
      if (typeof req.body?.query === 'string' && req.body.query.includes(queryFragment)) {
        req.alias = alias;
      }
    });
  });

  // Wait for the aliased GraphQL fetch to return, then (optionally) confirm
  // the results title is re-rendered.  Pairs with `aliasGraphqlQuery`.
  Cypress.Commands.add('awaitSearcherRefresh', (alias, resultsTextOrRegex) => {
    cy.wait(`@${alias}`, { timeout: TIMEOUTS.BACKEND_VALIDATION });
    if (resultsTextOrRegex) {
      cy.contains(resultsTextOrRegex, { timeout: TIMEOUTS.BACKEND_VALIDATION })
        .should('be.visible');
    }
  });

  // Click the "Reset" filter button and wait for the results title to
  // re-appear with the updated count.
  //
  //   resultsTextOrRegex — string or RegExp used by cy.contains to confirm
  //                        the results title has re-rendered.
  //   alias              — optional alias previously registered with
  //                        aliasGraphqlQuery; when set, the reset is awaited
  //                        via the GraphQL round-trip rather than the
  //                        staleness-prone text wait.
  Cypress.Commands.add('resetSearcherFilters', (resultsTextOrRegex, alias) => {
    cy.contains('button', 'Reset').click({ force: true });
    if (alias) {
      cy.awaitSearcherRefresh(alias, resultsTextOrRegex);
      return;
    }
    if (resultsTextOrRegex) {
      cy.contains(resultsTextOrRegex, { timeout: TIMEOUTS.BACKEND_VALIDATION });
    }
  });

  // Assert that a row containing ALL of the given values exists.
  //
  //   values — string or array of strings.  Each value must appear in at
  //            least one cell of the same row (repeated cy.contains calls
  //            scoped to `table tbody tr`).
  Cypress.Commands.add('assertTableRowVisible', (values) => {
    toArray(values).forEach((v) => {
      if (v === undefined || v === null || v === '') return;
      cy.contains('table tbody tr', v, { timeout: TIMEOUTS.BACKEND_VALIDATION })
        .should('exist');
    });
  });

  // Assert that no row containing any of the given values exists.
  Cypress.Commands.add('assertTableRowNotVisible', (values) => {
    toArray(values).forEach((v) => {
      if (v === undefined || v === null || v === '') return;
      cy.contains('table tbody tr', v).should('not.exist');
    });
  });

  // Two Tooltip-rendering patterns coexist in openIMIS row actions:
  //
  //   A) `withTooltip(<div><IconButton /></div>, 'X')`
  //      → <div title="X"><button …> or <a …>
  //      → selector: `[title="X"] button` (or `a`)
  //
  //   B) `<Tooltip title="X"><IconButton /></Tooltip>` (direct child)
  //      → <button title="X" …> (MUI v4 clones the title onto the child)
  //      → selector: `button[title="X"]`
  //
  // A caller shouldn't have to know which variant a given module uses, so the
  // helpers below try (A) first and fall back to (B) if no descendant tag is
  // found.  Edge-case: Edit often renders as an <a> (IconButton with href) so
  // `tag:'a'` callers still work — and in pattern (B) the <a> would itself
  // carry the title.
  function rowActionSelectors(actionTitle, tag) {
    return [
      `[title="${actionTitle}"] ${tag}`, // pattern A
      `${tag}[title="${actionTitle}"]`,  // pattern B
    ];
  }

  // Locate the action element inside a row, matching either tooltip shape.
  // Returns the DOM element, or null if the action isn't present.
  function findRowAction(rowEl, actionTitle, tag) {
    const [a, b] = rowActionSelectors(actionTitle, tag);
    return rowEl.querySelector(a) || rowEl.querySelector(b);
  }

  // Find a row by its (partial) text and click the action button/anchor
  // identified by its tooltip title.  See rowActionSelectors() above for the
  // two DOM shapes this supports.
  Cypress.Commands.add('openRowAction', (rowText, actionTitle, { tag = 'button' } = {}) => {
    cy.contains('table tbody tr', rowText)
      .should('exist')
      .then(($row) => {
        const found = findRowAction($row[0], actionTitle, tag);
        expect(found, `row action "${actionTitle}" (<${tag}>)`).to.exist;
        cy.wrap(found).click({ force: true });
      });
  });

  // Same as openRowAction but the chain subject is a boolean: `true` if the
  // row existed and the action was clicked, `false` if the row was absent.
  // Used by cleanup helpers that should be no-ops when the target row is
  // already gone.
  const ROW_WAIT_MS = 5000;

  Cypress.Commands.add('openRowActionIfPresent', (rowText, actionTitle, { tag = 'button' } = {}) => {
    const state = { clicked: false };

    // Use cy.get with a retryable .should to wait for either:
    //   (a) a row matching rowText to appear, or
    //   (b) the wait window to elapse (treated as "row not present").
    // We can't rely on .should's normal retry-on-fail since there's no
    // assertion we could write that's satisfied by BOTH outcomes, so the
    // retry is emulated with cy.wait + Cypress.$.
    const start = Date.now();
    const waitForRow = () => cy.get('body').then(($body) => {
      const rowEl = $body.find('table tbody tr').toArray()
        .find((tr) => tr.innerText.includes(rowText));
      if (rowEl) return rowEl;
      if (Date.now() - start > ROW_WAIT_MS) return null;
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(200).then(waitForRow);
    });

    return waitForRow()
      .then((rowEl) => {
        if (!rowEl) return;
        // Cypress returns jQuery-wrapped elements from .then() returns, so
        // normalise back to a raw HTMLElement for querySelector.
        const el = rowEl.nodeType ? rowEl : rowEl[0];
        const found = findRowAction(el, actionTitle, tag);
        if (!found) {
          throw new Error(
            `openRowActionIfPresent: row for "${rowText}" found but no "${actionTitle}" action (<${tag}>)`,
          );
        }
        cy.wrap(found).click({ force: true }).then(() => {
          state.clicked = true;
        });
      })
      .then(() => state.clicked);
  });
}
