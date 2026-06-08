export class ContributionPage {
    openFirstFamily() {
        cy.goToList('Insurees and Policies', 'Families/Groups');
        cy.openFirstRow('Head Ins. No.');
    }

    createPolicy() {
        cy.scrollTo('right');
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
        cy.clickIconButton('Add new contribution');
        cy.pickDate('Payment Date', 10);
        cy.selectDropdown('Payment Type');
        cy.chooseMuiAutocomplete('contribution.payer');
        cy.enterMuiInput('Receipt No.', contribution.receiptNo);
        cy.copyValueBetweenFields('Policy value', 'Amount');
        cy.save();
        cy.confirm('OK');
        cy.waitForGraphQL('save premium');
    }

    verifyPremium(contribution){
        this.openFirstFamily();
        cy.openFirstContribution();
        const inputFields = [
            ['Receipt No.', contribution.receiptNo]
        ];
        const selectFields = [
            'Payment Date',
            'contribution.payer',
            'Payment Type'
        ];
        selectFields.forEach((label) => cy.verifySelect(label));
        inputFields.forEach(([label, expectedValue]) => cy.verifyInput(label, expectedValue));
        cy.assertFieldsEqual('Policy value', 'Amount');
    }

    deleteContribution(){
        this.openFirstFamily();
        cy.deleteFirstRowInTable(3, "Delete contribution");
        cy.confirm('YES');
        cy.waitForGraphQL('delete contribution');
    }
}