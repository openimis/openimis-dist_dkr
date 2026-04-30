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
        cy.searchInput('Claim No.', code);
        cy.contains('td', code).should('be.visible');
    }

    searchClaim(claim){
        cy.goToList('Claims', 'Health Facility Claims');
        cy.searchInput('Claim No.', claim.code);
        cy.get('body').then(($body) => {
            const exists = $body
                .find('tr')
                .toArray()
                .some((row) => row.innerText.includes(claim.code));

            if (!exists) {
                this.createClaim(claim);
                cy.goToList('Claims', 'Health Facility Claims');
                cy.filterInputValue('Claim No.',claim.code);
            }
            cy.openRow('Claim No.', claim.code);
        });
    }

    duplicateClaim(claim){
        cy.duplicate();
        cy.enterMuiInput('Insurance No.', claim.chfId);
        cy.enterMuiInput('Claim No.', claim.code);
        cy.save();
    }

    createClaim(claim){
        cy.goToClaimForm();
        this.fillClaim(claim);
        cy.save();
    }

    fillClaim(claim) {
        cy.enterMuiInput('Insurance No.', claim.chfId);
        cy.chooseCraMuiDatePicker('Visit Date To', claim.visitDateTo);
        cy.chooseMuiAutocomplete('Main Diagnosis');
        cy.enterMuiInput('Claim No.', claim.code);
        cy.chooseServiceAutocomplete("", 0);
    }
}