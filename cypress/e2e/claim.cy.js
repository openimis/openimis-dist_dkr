import { ClaimPage } from "../support/pages/claimPage";

describe('Test for claim restoration', ()=>{
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

    it('Claim restoration workflow', ()=>{
        claimPage.openFirstRejectedClaim();
        claimPage.restoreClaim(data.restore.code);
        claimPage.verifyClaim(data.restore.code);
    });

    it('Claim duplication workflow', ()=>{
        claimPage.searchClaim(data.claim);
        claimPage.duplicateClaim(data.duplicate);
        claimPage.verifyClaim(data.duplicate.code);
    })
})