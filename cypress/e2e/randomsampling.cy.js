describe('Random Sampling Module', () => {
    beforeEach(function () {
        // 1. Visit the application frontend
        cy.visit('/front/');

        // 2. Load credentials and login
        cy.fixture('cred').then((cred) => {
            this.cred = cred;
            cy.get('input[type="text"]').type(this.cred.username);
            cy.get('input[type="password"]').type(this.cred.password);
            cy.get('button[type="submit"]').click();

            // Ensure login is successful and we are on the home page
            cy.contains('Welcome').should('be.visible');
        });
    });

    it('successfully initiates a random sampling of claims', function () {
        // 1. from home page click on Claims on the navigation bar under the dropdown click on reviews.
        cy.contains('Claims').click();
        cy.contains('Reviews').click();

        // 2. Reviews page opens. Click on "Claim Sample" button.
        // Technical prerequisite: filter to ensure there are claims and a Task Group can be selected
        // cy.enterMuiInput('Health Facility', 'UPHOS001');
        // cy.contains('button', /SEARCH/i).click();
        // cy.wait(500);

        cy.contains(/CLAIM SAMPLE/i).click();

        // 3. A popup appears. Enter sample percentage and select a task group from the dropdown.
        cy.contains('h2', 'Claim sample').should('be.visible');

        const randomPercent = Math.floor(Math.random() * 16) + 5;
        cy.enterMuiInput('Percent of claims', randomPercent);
        cy.chooseMuiSelect('Task Group', 'any');

        // 4. Finally, click on create sampling. The sampling is complete
        cy.contains(/CREATE CLAIM SAMPLE/i).click({ force: true });

        // Verify success confirmation and return to page
        cy.contains(/New task for claim sampling was created/i).should('be.visible');
        cy.contains(/CONFIRM/i).click({ force: true });

        // Verify that the table is visible again
        cy.get('table').should('be.visible');
    });
});
