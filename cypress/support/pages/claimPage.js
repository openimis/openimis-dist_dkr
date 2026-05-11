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
    }

    duplicateClaim(claim){
        cy.duplicate();
        cy.enterMuiInput('Insurance No.', claim.chfId);
        cy.enterMuiInput('Claim No.', claim.code);
        cy.save();
    }

    createClaim(claim, type){
        cy.goToClaimForm();
        this.fillClaim(claim, type);
        cy.save();
    }

    fillClaim(claim, type) {
        cy.enterMuiInput('Insurance No.', claim.chfId);
        cy.chooseCraMuiDatePicker('Visit Date To');
        cy.chooseMuiAutocomplete('Main Diagnosis');
        cy.enterMuiInput('Claim No.', claim.code);
        if(type == 'simple'){
            cy.chooseServiceAutocomplete("", index);
        } else {
            claim.services.forEach((service, index) =>{
                cy.chooseComplexServiceAutocomplete(service, 0);
            });
        }
    }

    verifyContent(claim){
        const inputFields = [
            ['Claim No.', claim.code],
            ['Insurance No.', claim.chfId]
        ];

        inputFields.forEach(([label, expectedValue]) => cy.verifyInput(label, expectedValue));
        claim.services.forEach((service, index) => {
            cy.verifyComplexServiceRow(index, service, claim.services.length);
        });
    }
}