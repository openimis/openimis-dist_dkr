export function registerRegistryCommands() {
  Cypress.Commands.add('uploadIndividualsCSV', (numIndividuals) => {
    cy.task('updateCSV', { numIndividuals }).then(() => {
      cy.contains('li', 'UPLOAD').click();

      cy.get('input[type="file"]').attachFile('tmp_individuals.csv');

      cy.chooseMuiSelect('Workflow', 'Python Import Individuals');
      cy.contains('button', 'Upload Individuals').click();
    });
  });

  Cypress.Commands.add('ensureSufficientIndividuals', (expectedNumIndividuals) => {
    cy.visit('/front/individuals');
    cy.getItemCount('Individual').then((count) => {
      const numToAdd = expectedNumIndividuals - count;
      if (numToAdd <= 0) {
        Cypress.log({
          name: 'ensureSufficientIndividuals',
          message: `Found ${count} which is more than ${expectedNumIndividuals}, no need to add additional`,
        });
        return;
      }

      cy.visit('/front/individuals');
      cy.uploadIndividualsCSV(numToAdd);

      cy.wait(200 * numToAdd); // group creation takes time

      cy.visit('/front/individuals');
      cy.getItemCount('Individual').then((newCount) => {
        expect(newCount).to.be.gte(expectedNumIndividuals);
      });
    });
  });

  // Count individuals currently in the DB that are NOT attached to any group.
  // Uses the backend `filterNotAttachedToGroup` argument (same one the modal
  // enrollment flow uses internally), hit via cy.request — the default
  // IndividualFilter UI does not expose this filter.
  Cypress.Commands.add('countStandaloneIndividuals', () => {
    const query = '{ individual(filterNotAttachedToGroup: true, isDeleted: false) { totalCount } }';
    return cy.request({
      method: 'POST',
      url: '/api/graphql',
      headers: { 'Content-Type': 'application/json' },
      body: { query },
    }).then((resp) => {
      expect(resp.status, 'GraphQL probe for standalone individuals').to.eq(200);
      const count = resp.body?.data?.individual?.totalCount;
      expect(count, 'totalCount in response').to.be.a('number');
      return count;
    });
  });

  // Ensure at least `expectedCount` individuals exist in the DB that are NOT
  // attached to any group — required for individual-type program enrollment
  // tests (grouped individuals are ineligible for individual programs).
  //
  // Standalone rows are fixed in `cypress/fixtures/individuals.csv` (the 20
  // rows at the tail with an empty `group_code`).  The `updateCSV` task
  // preserves them when randomising group codes, so uploading the full
  // fixture guarantees at least 20 new standalone individuals land in the DB.
  Cypress.Commands.add('ensureSufficientStandaloneIndividuals', (expectedCount) => {
    const STANDALONE_IN_FIXTURE = 20;
    const TOTAL_IN_FIXTURE = 120;
    if (expectedCount > STANDALONE_IN_FIXTURE) {
      throw new Error(
        `ensureSufficientStandaloneIndividuals: requested ${expectedCount} but `
        + `the fixture only provides ${STANDALONE_IN_FIXTURE} standalone rows. `
        + 'Extend cypress/fixtures/individuals.csv.',
      );
    }

    cy.countStandaloneIndividuals().then((count) => {
      if (count >= expectedCount) {
        Cypress.log({
          name: 'ensureSufficientStandaloneIndividuals',
          message: `Found ${count} standalone individuals (>= ${expectedCount}); skipping upload.`,
        });
        return;
      }

      Cypress.log({
        name: 'ensureSufficientStandaloneIndividuals',
        message: `Only ${count} standalone individuals; uploading fixture to add ${STANDALONE_IN_FIXTURE} more.`,
      });

      cy.visit('/front/individuals');
      // Upload the full fixture — the 20 standalone rows are at the tail so
      // we need numIndividuals >= TOTAL_IN_FIXTURE to include them.
      cy.uploadIndividualsCSV(TOTAL_IN_FIXTURE);

      // Async worker persists rows; 100ms per row is the established heuristic.
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(100 * TOTAL_IN_FIXTURE);

      cy.countStandaloneIndividuals().then((newCount) => {
        expect(newCount, 'standalone individuals after upload').to.be.gte(expectedCount);
      });
    });
  });

  Cypress.Commands.add('ensureSufficientHouseholds', (expectedNumGroups) => {
    cy.visit('/front/groups');
    cy.getItemCount('Group').then((numGroups) => {
      const numGroupsToAdd = expectedNumGroups - numGroups;
      if (numGroupsToAdd <= 0) {
        Cypress.log({
          name: 'ensureSufficientHouseholds',
          message: `Found ${numGroups} which is more than ${expectedNumGroups}, no need to add additional`,
        });
        return;
      }

      const numIndividualsToAdd = numGroupsToAdd * 5;
      cy.visit('/front/individuals');
      cy.uploadIndividualsCSV(numIndividualsToAdd);

      cy.wait(100 * numIndividualsToAdd); // group creation takes time

      cy.visit('/front/groups');
      cy.getItemCount('Group').then((newCount) => {
        expect(newCount).to.be.gte(expectedNumGroups);
      });
    });
  });

  Cypress.Commands.add('getItemCount', (itemName) => {
    const pattern = new RegExp(`\\d+ ${itemName}s? Found`);
    return cy.contains(pattern)
      .invoke('text')
      .then((text) => {
        const match = text.match(new RegExp(`(\\d+)\\s+${itemName}`));
        return parseInt(match?.[1], 10);
      });
  });
}
