import { ClaimPage } from "../support/pages/claimPage";

describe('Test for claim restoration', () => {
    let data;
    const claimPage = new ClaimPage();

    before(() => {
        cy.fixture('claim').then((fixture) => {
            data = fixture;
        });
    });

    beforeEach(() => {
        cy.login();
    });

    it('Claim restoration workflow', () => {
        claimPage.openFirstRejectedClaim();
        claimPage.restoreClaim(data.restore.code);
        claimPage.verifyClaim(data.restore.code);
    });

    it('Create claim with complex product workflow', () => {
        cy.goToList('Claims', 'Health Facility Claims');
        cy.contains('.MuiGrid-item', 'Claims Found').should('be.visible');
        claimPage.createClaim(data.claim, 'complex');
        claimPage.verifyClaim(data.claim.code);
        cy.openRow('Claim No.', data.claim.code);
        claimPage.verifyContent(data.claim);
    });

    it('Claim duplication workflow', () => {
        claimPage.searchClaim(data.claim);
        cy.openRow('Claim No.', data.claim.code);
        claimPage.duplicateClaim(data.duplicate);
        claimPage.verifyClaim(data.duplicate.code);
    });
})