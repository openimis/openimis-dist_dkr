import { TIMEOUTS } from '../../constants';

// Header order for the reconciliation CSV — matches the BE template exactly
// Editing or reordering these breaks the upload.
const RECONCILIATION_CSV_HEADERS = [
  'Payroll Name',
  'Payroll Status',
  'First Name',
  'Last Name',
  'Date of Birth',
  'Code',
  'Status',
  'Amount',
  'Type',
  'Receipt',
  'Paid',
];

function parseReconciliationCsvText(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/^﻿/, '').split('\n')
    .filter((line) => line.length > 0);
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
  return { headers, rows };
}

function buildReconciliationCsvText(rows) {
  const headerLine = RECONCILIATION_CSV_HEADERS.join(',');
  const bodyLines = rows.map((r) => RECONCILIATION_CSV_HEADERS.map((h) => r[h] ?? '').join(','));
  return `${[headerLine, ...bodyLines].join('\n')}\n`;
}

export function registerPayrollCommands() {
  Cypress.Commands.add('assertPayrollDetailFields', ({
    name,
    status,
    dateValidFrom,
    dateValidTo,
    paymentPlanCode,
    paymentCycleCode,
    paymentMethod,
    paymentPointName,
  }) => {
    cy.assertMuiInput('Name', name);
    if (status) {
      cy.assertMuiInput('Status', status);
    }
    cy.assertMuiInput('Valid From', dateValidFrom);
    if (dateValidTo) {
      cy.assertMuiInput('Valid To', dateValidTo);
    } else {
      cy.assertMuiInput('Valid To');
    }
    if (paymentMethod) {
      cy.assertMuiInput('Payment Method', paymentMethod);
    } else {
      cy.assertMuiInput('Payment Method');
    }
    if (paymentPlanCode) {
      cy.assertMuiAutoComplete('Payment Plan Picker', paymentPlanCode);
    }
    if (paymentCycleCode) {
      cy.assertMuiAutoComplete('Payment Cycle', paymentCycleCode);
    }
    if (paymentPointName) {
      cy.assertMuiAutoComplete('Payment Point', paymentPointName);
    }
  });

  Cypress.Commands.add('openCreatePayroll', () => {
    cy.visit('/front/payrolls');
    cy.contains('Payrolls Found');
    cy.clickCreate();
    cy.url().should('include', '/payrolls/payroll');
  });

  Cypress.Commands.add('fillPayrollForm', ({
    name,
    paymentPlanCode,
    paymentPlanName,
    paymentCycleCode,
    paymentMethod,
    dateValidFrom,
    dateValidTo,
  }) => {
    if (name !== undefined) {
      cy.enterMuiInput('Name', name);
    }
    if (paymentPlanCode) {
      cy.chooseMuiSelect('Payment Plan Picker', [paymentPlanCode, paymentPlanName].join(' - '));
    }
    if (paymentCycleCode) {
      // PaymentCyclePicker is an Autocomplete — typing triggers the filtered query.
      cy.chooseMuiAutocomplete('Payment Cycle', paymentCycleCode);
    }
    if (paymentMethod) {
      cy.chooseMuiSelect('Payment Method', paymentMethod);
    } else {
      // Payment methods are fetched dynamically; select the first available one.
      cy.chooseFirstMuiSelect('Payment Method');
    }
    if (dateValidFrom) {
      cy.enterDateInput('Valid From', dateValidFrom);
    }
    if (dateValidTo) {
      cy.enterDateInput('Valid To', dateValidTo);
    }
  });

  Cypress.Commands.add('savePayroll', () => {
    cy.clickSave();
    // the save actually succeeded.
    cy.url({ timeout: TIMEOUTS.BACKEND_VALIDATION }).should('match', /\/payrolls\/payroll\/.+/);
  });

  Cypress.Commands.add('createPayroll', ({
    name,
    paymentPlanCode,
    paymentPlanName,
    paymentCycleCode,
    paymentMethod,
    dateValidFrom,
    dateValidTo,
  }) => {
    cy.openCreatePayroll();
    cy.fillPayrollForm({
      name,
      paymentPlanCode,
      paymentPlanName,
      paymentCycleCode,
      paymentMethod,
      dateValidFrom,
      dateValidTo,
    });
    cy.savePayroll();
  });

  Cypress.Commands.add('filterPayrolls', ({
    name,
    status,
    paymentPlanCode,
    paymentCycleCode,
    paymentPointName,
    paymentMethod,
    showDeleted = false,
    visitPending = false,
  } = {}) => {
    cy.visit(visitPending ? '/front/payrollsPending' : '/front/payrolls');

    cy.contains('Payrolls Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });

    if (name !== undefined) {
      cy.enterMuiInput('Name', name);
    }
    if (status !== undefined) {
      cy.chooseMuiSelect('Status', status);
    }
    if (paymentPlanCode) {
      cy.chooseMuiSelect('Payment Plan Picker', paymentPlanCode);
    }
    if (paymentCycleCode) {
      cy.chooseMuiAutocomplete('Payment Cycle', paymentCycleCode);
    }
    if (paymentPointName) {
      cy.chooseMuiAutocomplete('Payment Point', paymentPointName);
    }
    if (paymentMethod) {
      cy.chooseMuiSelect('Payment Method', paymentMethod);
    }
    if (showDeleted) {
      cy.toggleMuiCheckbox('Show Deleted', true);
    }

    cy.aliasGraphqlQuery('payroll(', 'payrollSearch');
    cy.contains('button', 'Search').click();
    cy.awaitSearcherRefresh('payrollSearch', 'Payrolls Found');
  });

  Cypress.Commands.add('resetPayrollFilters', () => {
    cy.aliasGraphqlQuery('payroll(', 'payrollReset');
    cy.resetSearcherFilters('Payrolls Found', 'payrollReset');
  });

  Cypress.Commands.add('assertPayrollRowVisible', ({ name }) => {
    cy.assertTableRowVisible([name]);
  });

  Cypress.Commands.add('assertPayrollRowNotVisible', ({ name }) => {
    cy.assertTableRowNotVisible([name]);
  });

  Cypress.Commands.add('openPayrollForViewFromList', (name) => {
    cy.filterPayrolls({ name });
    cy.contains('table tbody tr', name)
      .should('exist')
      .within(() => {
        // Row has two IconButtons: View Details (first) and Delete (last).
        cy.get('button.MuiIconButton-root').first().click({ force: true });
      });
    cy.url().should('match', /\/payrolls\/payroll\/.+/);
  });

  // Full payroll delete flow: maker step (list → Delete → Ok) produces a
  // `payroll_delete` task; checker step assigns the permissive 'any' group.
  // The Ok click must be scoped to the confirmation dialog because an
  // unscoped cy.contains('button', 'Ok') can match the wrong button.
  Cypress.Commands.add('deletePayrollFromList', (name) => {
    // Intercept the deletePayroll mutation so we can detect when the Ok
    // click fails to actually fire it.  PayrollSearcher gates the mutation
    // on a `confirmed` coreConfirm reducer that can stay truthy across
    // sequential deletes in the same session — when it does, clicking Ok
    // dismisses the dialog without triggering deletePayrolls. 
    cy.intercept('POST', '/api/graphql', (req) => {
      if (typeof req.body?.query === 'string' && req.body.query.includes('deletePayroll')) {
        req.alias = 'deletePayrollMut';
      }
    });

    const clickDeleteAndOk = () => {
      cy.openRowActionIfPresent(name, 'Delete').then((found) => {
        if (!found) {
          Cypress.log({ name: 'deletePayrollFromList', message: `No payroll found matching "${name}"` });
          return;
        }
        cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
        cy.get('[role="dialog"]').contains('button', /^(ok|confirm|yes)$/i).click();
      });
    };

    cy.filterPayrolls({ name });
    clickDeleteAndOk();

    // Give the mutation a normal-load window to fire.  If it doesn't,
    // PayrollSearcher's reducer is stale — reload the list and retry once.
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2500);
    cy.get('@deletePayrollMut.all').then((interceptions) => {
      if (interceptions.length > 0) return;
      // Row may already be gone (no-op cleanup).
      cy.get('body').then(($body) => {
        const rowExists = $body.find('table tbody tr').toArray()
          .some((tr) => tr.innerText.includes(name));
        if (!rowExists) {
          Cypress.log({
            name: 'deletePayrollFromList',
            message: `Row for "${name}" already gone; skipping retry.`,
          });
          return;
        }
        cy.log(`deletePayroll mutation did not fire for "${name}" — reloading PayrollSearcher and retrying once`);
        cy.filterPayrolls({ name });
        clickDeleteAndOk();
        cy.wait('@deletePayrollMut', { timeout: 10000 });
      });
    });

    // After the mutation has fired (or the row was already gone), proceed
    // with the checker step.  Guard with the row-existence check so a
    // no-op cleanup short-circuits cleanly.
    cy.get('body').then(($body) => {
      const rowGone = !$body.find('table tbody tr').toArray()
        .some((tr) => tr.innerText.includes(name));
      // The page may have been navigated away during the retry visit —
      // re-anchor before checking.
      if (rowGone && !$body.find('table').length) return;
    });

    cy.url().should('include', '/payrolls');

    // Skip task approval if no mutation ever fired (row was already gone).
    cy.get('@deletePayrollMut.all').then((interceptions) => {
      if (interceptions.length === 0) {
        Cypress.log({ name: 'deletePayrollFromList', message: `No deletePayroll mutation fired for "${name}" — skipping task approval` });
        return;
      }
      cy.ensurePermissiveTaskGroup();
      // The delete-click produces a `payroll_delete` task that must be
      // approved to finalise the deletion.  The `accept_payroll` task
      // created at payroll creation is separate — approving it just
      // advances the payroll to APPROVE_FOR_PAYMENT, it does NOT delete.
      cy.approveTaskFromList({ containsText: ['payroll_delete', name] });
    });
  });

  // Approve the `accept_payroll` task that's emitted at payroll-creation time,
  // advancing the payroll PENDING_APPROVAL → APPROVE_FOR_PAYMENT.  The task
  // group must already exist (callers should invoke ensurePermissiveTaskGroup
  // in their before() hook).
  Cypress.Commands.add('approveAcceptPayrollTask', (payrollName) => {
    cy.ensurePermissiveTaskGroup();
    cy.approveTaskFromList({ containsText: ['accept_payroll', payrollName] });
  });

  // Approve the `payroll_reconciliation` task emitted when an operator clicks
  // "Approve and Close" on the Approve-for-Payment Summary dialog.  Note:
  // a CSV upload alone does NOT create this task — it only flips per-row
  // BenefitConsumption statuses.  The task + status transition to RECONCILED
  // are triggered exclusively by the close-payroll button.
  Cypress.Commands.add('approvePayrollReconciliationTask', (payrollName) => {
    cy.ensurePermissiveTaskGroup();
    cy.approveTaskFromList({ containsText: ['payroll_reconciliation', payrollName] });
  });

  // Open the Approve-for-Payment Summary dialog from the Approved Payrolls
  // list, click "Approve and Close" to fire the close_payroll mutation, then
  // wait for the dialog to dismiss.  The button is disabled until at least
  // one beneficiary is reconciled (StrategyOfflinePayment) or approved
  // (StrategyOnlinePayment).
  Cypress.Commands.add('approveAndClosePayrollFromSummary', (payrollName) => {
    cy.visit('/front/payrollsApproved');
    cy.contains('Payrolls Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });
    cy.enterMuiInput('Name', payrollName);
    cy.aliasGraphqlQuery('payroll(', 'approvedPayrollSearch_close');
    cy.contains('button', 'Search').click();
    cy.awaitSearcherRefresh('approvedPayrollSearch_close');

    cy.contains('table tbody tr', payrollName)
      .should('exist')
      .within(() => {
        cy.contains('button', /View Reconciliation Summary/i).click({ force: true });
      });

    cy.get('[role="dialog"]', { timeout: TIMEOUTS.BACKEND_VALIDATION }).should('be.visible');
    cy.get('[role="dialog"]')
      .contains('button', /Approve and Close/i)
      .should('not.be.disabled')
      .click({ force: true });

    // The mutation closes the dialog on success.
    cy.get('[role="dialog"]', { timeout: TIMEOUTS.BACKEND_VALIDATION }).should('not.exist');
  });

  // Synchronous CSV parser/builder exposed as cy commands for chaining.
  Cypress.Commands.add('parseReconciliationCsv', (csvText) => cy.wrap(parseReconciliationCsvText(csvText)));

  Cypress.Commands.add('buildReconciliationCsv', (rows) => cy.wrap(buildReconciliationCsvText(rows)));

  // UI-driven download of the reconciliation template.  Must be invoked while
  // the payroll detail page is open (the Download button lives in PayrollTab).
  // Returns `{ headers, rows, csvText }` via the chained subject.  The button
  // triggers `fetch()` for the blob download — we intercept the underlying
  // request and read the response body so the test does not depend on the
  // host-OS download folder behaviour in headless Electron.
  Cypress.Commands.add('downloadReconciliationFromUI', () => {
    cy.intercept('GET', '/api/payroll/csv_reconciliation/*').as('downloadRecCsv');
    cy.contains('button', /^Download$/i).click({ force: true });
    return cy.wait('@downloadRecCsv', { timeout: TIMEOUTS.BACKEND_VALIDATION }).then(({ response }) => {
      expect(response.statusCode).to.eq(200);
      const csvText = typeof response.body === 'string'
        ? response.body
        : new TextDecoder().decode(response.body);
      const { headers, rows } = parseReconciliationCsvText(csvText);
      return cy.wrap({ headers, rows, csvText });
    });
  });

  // UI-driven upload via the "Upload Payment Data" dialog (only rendered on
  // the payroll detail page when paymentMethod === 'StrategyOfflinePayment'
  // — at the API layer reconciliation works for any method, but the FE button
  // is gated, so callers must use the offline strategy).  Writes the edited
  // CSV under cypress/fixtures/_generated/ so cypress-file-upload can resolve
  // the relative fixture path, opens the dialog, attaches the file, submits,
  // waits for the POST, and then reloads (the dialog only closes itself; the
  // page does not refetch automatically).
  Cypress.Commands.add('uploadReconciliationFromUI', (payrollName, csvText) => {
    const safeName = payrollName.replace(/[^a-z0-9]+/gi, '_');
    // Each upload must have a unique file name — the BE rejects re-uploads
    // with `File already exists at the specified path` when payroll_id +
    // file_name collide.  The timestamp suffix makes successive uploads
    // (e.g. partial → full reconciliation in a single test) succeed.
    const fixtureRel = `_generated/recon_${safeName}_${Date.now()}.csv`;
    cy.writeFile(`cypress/fixtures/${fixtureRel}`, csvText);

    cy.contains('button', /Upload Payment Data/i).click({ force: true });
    cy.get('[role="dialog"]', { timeout: TIMEOUTS.BACKEND_VALIDATION }).should('be.visible');
    cy.get('[role="dialog"] input[type="file"]').attachFile(fixtureRel);

    cy.intercept('POST', '/api/payroll/csv_reconciliation/*').as('uploadRecCsv');
    cy.get('[role="dialog"]')
      .contains('button', /Upload Payment Data/i)
      .should('not.be.disabled')
      .click({ force: true });
    cy.wait('@uploadRecCsv', { timeout: TIMEOUTS.BACKEND_VALIDATION }).then((interception) => {
      const status = interception?.response?.statusCode;
      if (status >= 400) {
        // Surface the BE error so a 500 doesn't fail with just "expected N to be below 400".
        const body = interception?.response?.body;
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        throw new Error(`uploadReconciliation: BE returned ${status} — body: ${bodyStr?.slice(0, 1000)}`);
      }
      expect(status, 'upload status code').to.be.lt(400);
    });

    cy.get('[role="dialog"]', { timeout: TIMEOUTS.BACKEND_VALIDATION }).should('not.exist');
    cy.reload();
  });

  // Open the "View Reconciliation Summary" dialog from the Approved Payrolls
  // list and assert the three Paper-card values.  Pass `{ selected, total,
  // totalAmount, totalDelivered }`.  All four are required; pass null/undefined
  // to skip a specific assertion.
  Cypress.Commands.add('assertReconciliationSummary', (payrollName, expected) => {
    cy.visit('/front/payrollsApproved');
    cy.contains('Payrolls Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });
    cy.enterMuiInput('Name', payrollName);
    cy.aliasGraphqlQuery('payroll(', 'approvedPayrollSearch');
    cy.contains('button', 'Search').click();
    cy.awaitSearcherRefresh('approvedPayrollSearch');

    cy.contains('table tbody tr', payrollName)
      .should('exist')
      .within(() => {
        cy.contains('button', /View Reconciliation Summary/i).click({ force: true });
      });

    cy.get('[role="dialog"]', { timeout: TIMEOUTS.BACKEND_VALIDATION }).should('be.visible');
    cy.get('[role="dialog"]').contains('View Reconciliation Summary:').should('exist');
    cy.get('[role="dialog"]').contains(payrollName).should('exist');

    // The summary cards finish populating once the payroll fetch resolves.
    // Re-scope each assertion to `[role="dialog"]` to dodge stale-DOM errors
    // when the dialog content re-renders between the title check and the
    // card checks.
    if (expected.selected !== undefined && expected.total !== undefined) {
      cy.get('[role="dialog"]', { timeout: TIMEOUTS.BACKEND_VALIDATION })
        .contains(`${expected.selected} of ${expected.total}`, { timeout: TIMEOUTS.BACKEND_VALIDATION })
        .should('exist');
    }
    if (expected.totalAmount !== undefined) {
      cy.get('[role="dialog"]')
        .contains('Total Amount for Invoice')
        .closest('div.MuiPaper-root')
        .contains(String(expected.totalAmount))
        .should('exist');
    }
    if (expected.totalDelivered !== undefined) {
      cy.get('[role="dialog"]')
        .contains('Total Delivered Per Reconciliation')
        .closest('div.MuiPaper-root')
        .contains(String(expected.totalDelivered))
        .should('exist');
    }

    cy.get('[role="dialog"]').contains('button', /Close/i).click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  Cypress.Commands.add('openPayrollPendingSummary', (payrollName) => {
    cy.visit('/front/payrollsPending');
    cy.contains('Payrolls Found');
    // Filter by name so the row is visible even when many payrolls have accumulated
    // from previous test runs and the list paginates (default 10 per page).
    cy.enterMuiInput('Name', payrollName);
    cy.aliasGraphqlQuery('payroll(', 'pendingPayrollSearch');
    cy.contains('button', 'Search').click();
    cy.awaitSearcherRefresh('pendingPayrollSearch');
    cy.contains('table tbody tr', payrollName)
      .should('exist')
      .within(() => {
        cy.contains('button', 'View Reconciliation Summary').click();
      });
    cy.get('[role="dialog"]', { timeout: TIMEOUTS.BACKEND_VALIDATION })
      .should('be.visible')
      .within(() => {
        cy.contains('View Reconciliation Summary:').should('exist');
        cy.contains(payrollName).should('exist');
      });
  });
}
