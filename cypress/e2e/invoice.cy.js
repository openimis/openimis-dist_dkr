const data = {
    payment: {
        reconciliationStatus: "Reconciliated",
        status: "Accepted",
        reference: "ref001",
        payerName: "Joseph",
        code: "INV54",
        label: "INS",
        codeThirdparty: "SP01",
        receiptNumber: "6445445",
        fees: 1224,
        amountReceived: 500,
        paymentDate: "19",
        paymentOrigin: "epargne"
    },
    invoice: {
        code: "IV-FCUL0001-171000001-2026-06"
    }
}

//invoice actions
const Invoice = {

    goToList: () => {
        cy.contains('Legal and Finance').click();
        cy.contains('a', 'Invoices').click();
    },

    goToForm: () => {
        Invoice.goToList();
        cy.enterMuiInput('Code', data.invoice.code, "input");
        cy.contains('button', 'Search').click({ force: true });
        cy.openRow(data.invoice.code);
        cy.contains(data.invoice.code).should('be.visible')
        cy.scrollTo('bottom');
        cy.contains('button', 'Payments').click();
        cy.get('[data-testid="AddIcon"]').click({ force: true });
    },

    fillForm: (payment) => {

        cy.get('[role="dialog"]').within(() => {
            cy.get('[aria-haspopup="listbox"]').eq(0).click()
        });
        cy.get('[role="option"]').contains(payment.reconciliationStatus).click();
        cy.get('[role="listbox"]').should('not.exist');

        cy.get('[role="dialog"]').within(() => {
            cy.get('[aria-haspopup="listbox"]').eq(1).click()
        })
        cy.get('[role="option"]').contains(payment.status).click()

        cy.get('[role="dialog"]').within(() => {
            cy.enterMuiInput('Payer Reference', payment.reference);
            cy.enterMuiInput('Payer Name', payment.payerName);
            cy.enterMuiInput('Code', payment.code);
            cy.enterMuiInput('Label', payment.label);
            cy.enterMuiInput('Code Thirdparty', payment.codeThirdparty);
            cy.enterMuiInput('Receipt Number', payment.receiptNumber);
            cy.enterMuiInput('Fees', payment.fees);
            cy.enterMuiInput('Amount Received', payment.amountReceived);
            cy.chooseMuiDatePicker('Payment Date', payment.paymentDate);
            cy.enterMuiInput('Payment Origin', payment.amountReceived);
        })
    },

    verifyExists: (payment) => {
        Invoice.goToList();
        cy.enterMuiInput('Code', data.invoice.code, "input");
        cy.contains('button', 'Search').click({ force: true });
        cy.get('table').should('be.visible')
        cy.contains('td', data.invoice.code)
            .should('be.visible')
            .dblclick()
        cy.contains(data.invoice.code).should('be.visible')
        cy.scrollTo('bottom');
        cy.contains('Payments').click();
        cy.contains('Search Criteria')
            .closest('.MuiPaper-root')
            .within(() => {
                cy.enterMuiInput('Code', payment.code, "input");
            });
        cy.contains('button', 'Search').click();
        cy.get('table').should('be.visible');
        cy.contains('td', payment.code)
            .should('be.visible')
    },

    delete: (payment, options = {}) => {
        const { failIfMissing = true } = options;

        Invoice.verifyExists(payment);
        cy.scrollTo('right');

        cy.get('body').then(($body) => {
            const hasPayment = $body.find('tr').toArray().some((row) => row.innerText.includes(payment.code));

            if (!hasPayment) {
                if (!failIfMissing) {
                    cy.log(`Payment ${payment.code} not found, skipping deletion`);
                    return;
                }
                throw new Error(`Payment ${payment.code} not found for deletion`);
            }

            cy.contains('Payments Found')
                .closest('.MuiPaper-root')
                .within(() => {
                    cy.contains('tr', payment.code)
                        .within(() => {
                            cy.get('[aria-label="Delete"]').click();
                        });
                });

            cy.get('[role="dialog"]').within(() => {
                cy.contains('button', 'OK', { matchCase: false }).click({ force: true });
            });
        })

        // verify delete
        Invoice.goToList();
        cy.enterMuiInput('Code', data.invoice.code, "input");
        cy.contains('button', 'Search').click({ force: true });
        cy.get('table').should('be.visible')
        cy.contains('Invoices Found')
            .closest('.MuiPaper-root')
            .within(() => {
                cy.contains('tr', data.invoice.code)
                    .within(() => {
                        cy.get('[aria-label="Edit"]').click();
                    });
            });
        cy.contains(data.invoice.code).should('be.visible')
        cy.scrollTo('bottom');
        cy.contains('Payments').click();
        cy.contains('Search Criteria')
            .closest('.MuiPaper-root')
            .within(() => {
                cy.enterMuiInput('Code', payment.code, "input");
            });
        cy.contains('button', 'Search').click();
        cy.get('table').should('be.visible');
        cy.contains('td', data.payment.code)
            .should('not.be.visible')
    },
}


//test for invoice payment
describe('Invoice payment workflow', () => {

    afterEach(() => {
        Invoice.delete(data.payment, { failIfMissing: false });
    });

    it('Create a new payment for invoice', () => {
        cy.login();
        Invoice.goToForm();
        Invoice.fillForm(data.payment);
        cy.get('[role="dialog"]').within(() => {
            cy.contains('button', 'Create').click({ force: true })
        })
        Invoice.verifyExists(data.payment);
    })
})