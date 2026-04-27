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
        claimPage.restoreClaim(data.claim.code);
        claimPage.verifyClaim(data.claim.code);
    })
})