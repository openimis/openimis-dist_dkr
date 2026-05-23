import { ContributionPage } from "../support/pages/ContributionPage";

describe('Test for user management', () => {
    let data;
    const contributionPage = new ContributionPage();

    before(() => {
        cy.fixture('contribution').then((fixture) => {
            data = fixture;
        });
    });

    beforeEach(() => {
        cy.login();
    });

    afterEach(function () {
        if (this.currentTest.state === 'failed') return;
        contributionPage.deletePolicy(); //delete policy and contribution
    });

    it('contribution management workflow', () => {
        //contributionPage.openFirstFamily(); // open first family
        //contributionPage.createPolicy(); // create policy
        contributionPage.createPremium(data.contribution); // create contribution
        contributionPage.verifyPremium(data.contribution); // verify contribution
    });
})