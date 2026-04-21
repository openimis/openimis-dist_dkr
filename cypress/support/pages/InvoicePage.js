const SELECTORS = {
    listbox: '[role="listbox"]',
    option: '[role="option"]',
    dialog: '[role="dialog"]',
    addIcon: 'button.MuiFab-primary',
    deleteBtn: 'button[title="Delete"]',
    editBtn: '[aria-label="Edit"]',
    saveButton: '[title="Save changes"] button',
    table: 'table',
};

const formatDate = ({ day, month, year }) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
};

export class InvoicePage {

    goToList() {
        cy.contains('Legal and Finance').click();
        cy.contains('a', 'Invoices').click();
    }

    searchByCode(code) {
        cy.enterMuiInput('Code', code, 'input');
        cy.contains('button', 'Search').click({ force: true });
        cy.get(SELECTORS.table).should('be.visible');
    }

    openPaymentsTab() {
        cy.scrollTo('bottom');
        cy.contains('button', 'Payments').click();
    }

    goToForm(headChfId) {
        this.goToList();
        this.searchByCode(headChfId);
        this.openRow(headChfId);
        cy.get('input[value="Family"]').should('be.visible');
        this.openPaymentsTab();
        cy.get(SELECTORS.addIcon).click({ force: true });
    }

    openRow(code) {
        cy.contains('td', code)
            .closest('tr')
            .dblclick();
    }

    selectDropdown(index, value) {
        cy.get(SELECTORS.dialog).within(() => {
            cy.get('[aria-haspopup="listbox"]').eq(index).click();
        });
        cy.get(SELECTORS.option).contains(value).click();
        cy.get(SELECTORS.listbox).should('not.exist');
    }

    fillForm(payment) {
        this.selectDropdown(0, payment.reconciliationStatus);
        this.selectDropdown(1, payment.status);

        cy.get(SELECTORS.dialog).within(() => {
            const fields = [
                ['Payer Reference', payment.reference],
                ['Payer Name', payment.payerName],
                ['Code', payment.code],
                ['Label', payment.label],
                ['Code Thirdparty', payment.codeThirdparty],
                ['Receipt Number', payment.receiptNumber],
                ['Fees', payment.fees],
                ['Amount Received', payment.amountReceived],
                ['Payment Origin', payment.paymentOrigin],
            ];
            fields.forEach(([label, value]) => cy.enterMuiInput(label, value));
            cy.chooseCraMuiDatePicker('Payment Date', payment.paymentDate);
        });
    }

    searchPayment(headChfId, paymentCode) {
        this.goToList();
        this.searchByCode(headChfId);
        this.openRow(headChfId);
        cy.get('input[value="Family"]').should('be.visible');
        this.openPaymentsTab();

        cy.contains('Search Criteria')
            .closest('.MuiPaper-root')
            .within(() => cy.enterMuiInput('Code', paymentCode, 'input'));

        cy.contains('button', 'Search').click();
        cy.get(SELECTORS.table).should('be.visible');
    }

    verifyExists(invoiceCode, payment) {
        this.searchPayment(invoiceCode, payment.code);
        cy.contains('td', payment.code).should('be.visible');
        this.verifyRowValues(payment);
    }

    verifyRowValues(payment) {
        cy.contains('Payments Found')
            .closest('.MuiPaper-root')
            .within(() => {
                cy.contains('tr', payment.code)
                    .within(() => {
                        cy.get('input[disabled]')
                            .should('have.value', payment.reconciliationStatus);
                        cy.get('td').eq(1).should('have.text', payment.code);
                        cy.get('td').eq(2).should('have.text', payment.label);
                        cy.get('td').eq(3).should('have.text', payment.codeThirdparty);
                        cy.get('td').eq(4).should('have.text', payment.receiptNumber);
                        cy.get('td').eq(5).should('have.text', `${payment.fees}.00`);
                        cy.get('td').eq(6).should('have.text', `${payment.amountReceived}.00`);
                        cy.get('td').eq(7).should('have.text', formatDate(payment.paymentDate));
                        cy.get('td').eq(8).should('have.text', payment.paymentOrigin);
                        cy.get('td').eq(9).should('have.text', payment.reference);
                    });
            });
    }

    deletePayment(invoiceCode, payment, { failIfMissing = true } = {}) {
        this.searchPayment(invoiceCode, payment.code);
        cy.scrollTo('right');

        cy.get('body').then(($body) => {
            const exists = $body
                .find('tr')
                .toArray()
                .some((row) => row.innerText.includes(payment.code));

            if (!exists) {
                if (!failIfMissing) {
                    cy.log(`Payment "${payment.code}" not found — delete aborted`);
                    return;
                }
                throw new Error(`Payment "${payment.code}" not found for deletion`);
            }

            cy.contains('Payments Found')
                .closest('.MuiPaper-root')
                .within(() => {
                    cy.contains('tr', payment.code)
                        .find(SELECTORS.deleteBtn)
                        .click();
                });

            cy.get(SELECTORS.dialog).within(() => {
                cy.contains('button', 'OK', { matchCase: false }).click({ force: true });
            });
            cy.waitForGraphQL('deletePayment');

            this.searchPayment(invoiceCode, payment.code);
            cy.contains('td', payment.code).should('not.exist');
        });
    }

    goToFamilyList = () => cy.goToSubMenu('Insurees and Policies', 'Families/Group');

    searchFamily(code) {
        this.goToFamilyList();
        cy.enterMuiInput('Head Ins. No.', code, 'input');
        cy.contains('button', 'Search').click({ force: true });
        cy.waitForGraphQL('searchFamily');
        cy.contains('Families/Groups Found').should('be.visible');
    }

    createFamily(family) {
        this.searchFamily(family.head.chfId);
        cy.get('body').then(($body) => {
            const exists = $body
                .find('tr')
                .toArray()
                .some((row) => row.innerText.includes(family.head.chfId));

            if (exists) {
                return;
            } else {
                cy.get(SELECTORS.addIcon).click({ force: true });
                this.fillFamilyForm(family);
                cy.get(SELECTORS.saveButton).click({ force: true });
                cy.waitForGraphQL('saveFamily');
            }
        });
    }

    fillFamilyForm(family) {
        cy.chooseMuiSelect('Village', family.location);
        cy.enterMuiInput('Insurance No.', family.head.chfId, 'input');
        cy.enterMuiInput('Last Name', family.head.lastName);
        cy.enterMuiInput('Given Names', family.head.givenNames);
        cy.chooseCraMuiDatePicker('Birth Date', family.head.dob);
        cy.chooseMuiSelect('Gender', family.head.gender);
    }

    createPolicy(headChfId, policy) {
        this.searchFamily(headChfId);
        this.openRow(headChfId);
        cy.contains('button', 'Add policy').click({ force: true });
        cy.waitForGraphQL('openPolicy');
        this.fillPolicyForm(policy);
        cy.get(SELECTORS.saveButton).click({ force: true });
        cy.contains('button', 'Close').click();
        cy.waitForGraphQL('createPolicy');
    }

    fillPolicyForm(policy) {
        cy.chooseMuiAutocomplete('Product', policy.product.name);
        cy.chooseMuiSelect('Officer', policy.officer.code);
    }
}

export const invoicePage = new InvoicePage();