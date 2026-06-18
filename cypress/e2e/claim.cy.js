
describe('Test for claim restoration', () => {
    let data;

    before(() => {
        cy.fixture('claim').then((fixture) => {
            data = fixture;
        });
    });

    beforeEach(() => {
        cy.login();
    });

    it('Claim restoration workflow', () => {
        cy.openFirstRejectedClaim();
        cy.restoreClaim(data.restore.code);
        cy.verifyClaim(data.restore.code);
    });

    it('Create claim with complex product workflow', () => {
        cy.goToList('Claims', 'Health Facility Claims');
        cy.createClaim(data.claim, 'complex');
        cy.verifyClaim(data.claim.code);
        cy.openRow('Claim No.', data.claim.code);
        cy.verifyContent(data.claim);
    });

    it('Claim duplication workflow', () => {
        cy.searchClaim(data.claim);
        cy.openRow('Claim No.', data.claim.code);
        cy.duplicateClaim(data.duplicate);
        cy.verifyClaim(data.duplicate.code);
    });
})