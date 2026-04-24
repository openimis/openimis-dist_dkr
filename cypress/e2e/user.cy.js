import { UserPage } from "../support/pages/UserPage";

describe('Test for user management', () => {
    let data;
    const userPage = new UserPage();

    before(() => {
        cy.fixture('user').then((fixture) => {
            data = fixture;
        });
    });

    beforeEach(() => {
        cy.login();
    });

    afterEach(function () {
        if (this.currentTest.state === 'failed') return;
        userPage.filterByVillage();
    });

    it('user management workflow', () => {
        userPage.addUser(data.user);
        userPage.verifyUser(data.user);
        userPage.updateUser('Last name', "Joseph");
        userPage.deleteUser(data.user.username);
        cy.searchInput('User name', data.user.username);
        cy.contains('td',data.user.username).should('not.exist');
    });
})