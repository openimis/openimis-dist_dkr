import { TIMEOUTS } from '../constants';

export function registerTaskCommands() {
  // Shared task-group creation flow.  Both ensurePermissiveTaskGroup and
  // ensurePaymentCycleTaskGroup follow the same recipe — only the code and
  // optional list of task sources differ.
  function ensureTaskGroup({ code, taskSources = [] }) {
    cy.visit('/front/tasks/groups');
    cy.contains('Task Groups Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });

    cy.get('table').then(($table) => {
      const exists = $table.find('tbody tr td:first-child')
        .toArray()
        .some((td) => td.innerText.trim() === code);

      if (exists) {
        cy.log(`Task group "${code}" already exists — skipping creation.`);
        return;
      }

      cy.clickCreate();

      cy.enterMuiInput('Code', code);
      cy.chooseMuiSelect('Policy Status', 'ANY');
      cy.chooseMuiAutocomplete('Task Executors', 'Admin');
      taskSources.forEach((src) => {
        cy.chooseMuiAutocomplete('Task Sources', src);
      });

      cy.saveAndAwaitJournal({
        mutationLabel: 'Create task group',
        assertNoFail: true,
      });
    });
  }

  // Shared tail of every task-approval flow.  Assumes the task detail page
  // is open and the task is in an approvable state.  Clicks the first
  // enabled Fab (the Approve button — Save Fab is disabled after its own
  // click so this reliably lands on Approve), confirms the "Are you sure?"
  // dialog, and waits for the dialog to close.
  function clickApproveAndConfirm() {
    cy.get('button.MuiFab-root:not(.Mui-disabled)', { timeout: TIMEOUTS.BACKEND_VALIDATION })
      .first()
      .click();
    cy.contains('button', 'Ok', { timeout: 10000 }).click();
    cy.get('[role="dialog"]', { timeout: TIMEOUTS.BACKEND_VALIDATION }).should('not.exist');
  }

  Cypress.Commands.add('ensurePermissiveTaskGroup', () => {
    ensureTaskGroup({ code: 'any' });
  });

  // Ensure a task group for PaymentCycleService tasks exists.  When a task
  // group has task_sources: ["PaymentCycleService"], any payment cycle task
  // is auto-assigned to this group with status ACCEPTED (instead of staying
  // RECEIVED with no group).  A group with status ACCEPTED can be approved
  // via the task management UI.
  Cypress.Commands.add('ensurePaymentCycleTaskGroup', (taskGroupName = 'pc-cycles') => {
    ensureTaskGroup({ code: taskGroupName, taskSources: ['PaymentCycleService'] });
  });

  // Generic maker-checker approval driver.  Navigates to /front/AllTasks,
  // finds the first row where every string in `containsText` appears in the
  // row's innerText, opens the task detail page, assigns the task to the
  // given task group (default 'any'), saves, then scrolls to the bottom and
  // clicks the Approve Fab and confirms the "Are you sure?" dialog.
  //
  // Example — approve the payroll_delete task for a specific payroll:
  //   cy.approveTaskFromList({ containsText: ['payroll_delete', payrollName] });
  //
  // The 'any' group must already exist (created via ensurePermissiveTaskGroup);
  // this command does not create it implicitly so callers can opt into a
  // different group without side-effects.
  Cypress.Commands.add('approveTaskFromList', ({
    containsText = [],
    groupCode = 'any',
  } = {}) => {
    const texts = Array.isArray(containsText) ? containsText : [containsText];
    if (texts.length === 0) {
      throw new Error('approveTaskFromList: provide at least one `containsText` entry');
    }

    const MAX_ATTEMPTS = 3;
    const INTERVAL_MS = 10000;
    // Longest text is the most-specific identifier (e.g. payroll name vs action type)
    // and is used as the Entity filter value on /front/AllTasks to avoid scanning
    // pages of accumulated tasks.
    const filterText = [...texts].sort((a, b) => b.length - a.length)[0];

    const waitForTaskRow = (attempt = 1) => {
      cy.visit('/front/AllTasks');
      cy.contains('Tasks Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });
      cy.enterMuiInput('Entity', filterText);
      cy.aliasGraphqlQuery('task(', `taskSearch_${attempt}`);
      cy.contains('button', 'Search').click();
      cy.awaitSearcherRefresh(`taskSearch_${attempt}`, 'Tasks Found');
      cy.get('body').then(($body) => {
        const $rows = $body.find('table tbody tr');
        const matched = $rows.toArray().filter((tr) => (
          texts.every((t) => tr.innerText.includes(t))
        ));
        if (matched.length > 0) {
          Cypress.log({
            name: 'approveTaskFromList',
            message: `found task after ${attempt} attempt(s): ${JSON.stringify(texts)}`,
          });
          return;
        }
        if (attempt >= MAX_ATTEMPTS) {
          throw new Error(
            `approveTaskFromList: no task matched ${JSON.stringify(texts)} `
            + `after ${MAX_ATTEMPTS} polls (${(MAX_ATTEMPTS * INTERVAL_MS) / 1000}s)`,
          );
        }
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(INTERVAL_MS).then(() => waitForTaskRow(attempt + 1));
      });
    };

    waitForTaskRow();

    cy.get('table tbody tr')
      .filter((_, tr) => texts.every((t) => tr.innerText.includes(t)))
      .first()
      .within(() => {
        cy.get('button[title="View details"]').click({ force: true });
      });

    cy.url({ timeout: TIMEOUTS.BACKEND_VALIDATION }).should('include', '/tasks/task/');

    // Assign the permissive task group. 
    const taskGroupInput = () => cy.contains('label', 'Task Group')
      .siblings('.MuiInputBase-root')
      .find('input');
    const optionSelector = '[role="listbox"] li, [role="presentation"] li, li[role="option"]';
    const MAX_GROUP_PICK_ATTEMPTS = 3;

    const pickTaskGroup = (attempt = 1) => {
      taskGroupInput().click({ force: true });
      taskGroupInput().clear({ force: true });
      taskGroupInput().type(groupCode, { force: true });
      cy.contains(optionSelector, groupCode, { timeout: TIMEOUTS.BACKEND_VALIDATION })
        .click({ force: true });
      taskGroupInput().invoke('val').then((val) => {
        if (val === groupCode) return;
        if (attempt >= MAX_GROUP_PICK_ATTEMPTS) {
          throw new Error(
            `approveTaskFromList: Task Group autocomplete did not accept "${groupCode}" `
            + `after ${MAX_GROUP_PICK_ATTEMPTS} attempts (final value="${val}")`,
          );
        }
        Cypress.log({
          name: 'pickTaskGroup',
          message: `value="${val}" after click; retrying (attempt ${attempt + 1}/${MAX_GROUP_PICK_ATTEMPTS})`,
        });
        pickTaskGroup(attempt + 1);
      });
    };

    pickTaskGroup();
    taskGroupInput().should('have.value', groupCode);

    // Save changes — the task form's Save FAB. After save, task transitions
    // from RECEIVED → ACCEPTED and the approve/fail Fabs enable.
    cy.clickSave();

    // The TaskApprovementPanel renders at the bottom of the page.  Use
    // ensureScrollable:false because very short task detail pages may not
    // require scrolling at all — scrolling is only a convenience.
    cy.scrollTo('bottom', { ensureScrollable: false });

    clickApproveAndConfirm();
  });

  // Approve the most recently created PaymentCycleService task.
  Cypress.Commands.add('approveLatestPaymentCycleTask', () => {
    cy.visit('/front/AllTasks');
    cy.contains('Tasks Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });

    cy.contains('table tbody tr', 'PaymentCycleService', { timeout: TIMEOUTS.BACKEND_VALIDATION })
      .first()
      .within(() => {
        cy.get('button.MuiIconButton-root').click({ force: true });
      });

    // Task detail page: /front/tasks/task/<uuid>
    cy.url({ timeout: TIMEOUTS.BACKEND_VALIDATION }).should('include', '/tasks/task/');

    clickApproveAndConfirm();
  });
}
