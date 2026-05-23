export class ContributionPage {
    openFirstFamily() {
        cy.goToList('Insurees and Policies', 'Families/Groups');
        cy.openFirstRow('Head Ins. No.');
    }

    createPolicy() {
        cy.contains('button', 'Add policy').click();
        cy.waitForGraphQL('fetch products')
        cy.chooseMuiAutocomplete('Product');
        cy.chooseMuiAutocomplete('Officer');
        cy.save();
        cy.confirm('CLOSE');
        this.openFirstFamily();
    }

    createPremium(contribution) {
        this.openFirstFamily();
        cy.selectLastPolicy();
        cy.contains('button', 'New contribution').click();
        cy.chooseTodayDatePicker('Payment Date');
        cy.chooseMuiAutocomplete('Payer');
        cy.selectDropdown('Payment Type');
        cy.enterMuiInput('Receipt No.', contribution.receiptNo);
        cy.enterMuiInput('Amount', contribution.amount);
        cy.save();
        cy.confirm('OK');
        cy.confirm('YES')
        cy.waitForGraphQL('save premium');

        //cy.get('table tbody tr').last().contains('button', 'Renew').click();

    }

    verifyPremium(contribution){
        this.openFirstFamily();
        cy.openFirstContribution();
        const inputFields = [
            ['Receipt No.', contribution.receiptNo],
            ['Amount', contribution.amount]
        ];
        const selectFields = [
            'Payment Date',
            'Payer',
            'Payment Type'
        ];
        selectFields.forEach((label) => cy.verifySelect(label));
        inputFields.forEach(([label, expectedValue]) => cy.verifyInput(label, expectedValue));
    }

    deletePolicy(){
        this.openFirstFamily();
        cy.deleteFirstContribution();
        cy.confirm('YES');
        cy.waitForGraphQL('delete policy & contribution');
    }
}