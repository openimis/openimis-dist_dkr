export class ClaimPage {
    openFirstRejectedClaim(){
        cy.goToList('Claims', 'Health Facility Claims');
        cy.selectDropdown('Claim Status', 'Rejected');
        cy.contains('button', 'Search').click({ force: true });
        cy.waitForGraphQL('search')
        cy.openFirstRow('Claim No.');
    }

    restoreClaim(newCode){
        cy.restore();
        cy.enterMuiInput('Claim No.', newCode);
        cy.contains(`Claim ${newCode}`).should('be.visible');
        cy.save();
    }

    verifyClaim(code){
        cy.goToList('Claims', 'Health Facility Claims');
        cy.contains('button', 'Reset filters').click({ force: true });
        cy.enterMuiInput('Claim No.', code);
        cy.contains('button', 'Search').click();
        cy.waitForGraphQL('search');
        cy.contains('td', code).should('be.visible');
    }
}