const SELECTORS = {
    listbox: '[role="listbox"]',
    option: '[role="option"]',
    dialog: '[role="dialog"]',
    addIcon: 'button.MuiFab-primary',
    deleteBtn: 'button[title="Delete"]',
    editBtn: '[aria-label="Edit"]',
    saveButton: '[title="Save changes"] button',
    restoreButton: '[title="Restore the claim"] button',
    duplicateButton: '[title="Duplicate the claim"] button',
    table: 'table',
    deleteUserBtn: 'button[title="Delete user"]'
};

export function claimCommands() {
    Cypress.Commands.add('goToList', (menuLabel, subMenuLabel, index = 0) => {
        cy.contains(menuLabel).click();
        cy.get('a').filter(`:contains("${subMenuLabel}")`).eq(index).click();
    });

    Cypress.Commands.add('selectDropdown', (identifier, value) => {
        if (typeof identifier === 'number') {
            cy.get('[aria-haspopup="listbox"]').eq(identifier).click({ force: true });
        } else {
            cy.contains('label', identifier)
                .closest('.MuiFormControl-root')
                .find('[aria-haspopup="listbox"]')
                .click({ force: true });
        }

        if (value) {
            cy.get(SELECTORS.option)
                .filter((_, el) => el.innerText.trim() === value)
                .first()
                .click();
        } else {
            cy.get(SELECTORS.option).first().click();
        }

        cy.get(SELECTORS.listbox).should('not.exist');
    });

    Cypress.Commands.add('waitForGraphQL', (alias = 'graphqlRequest') => {
        cy.intercept('POST', '**/api/graphql').as(alias);
        return cy.wait(`@${alias}`);
    });

    Cypress.Commands.add('openFirstRow', (label) => {
        cy.get('tbody tr')
            .first()
            .dblclick();
        cy.contains('label', label)
            .closest('.MuiFormControl-root')
            .find('input')
            .should('be.visible');
    });

    Cypress.Commands.add('openFirstRejectedClaim', () => {
        cy.goToList('Claims', 'Health Facility Claims');
        cy.selectDropdown('Claim Status', 'Rejected');
        cy.contains('button', 'Search').click({ force: true });
        cy.waitForGraphQL('search')
        cy.openFirstRow('Claim No.');
    });

    Cypress.Commands.add('save', () => {
        cy.get(SELECTORS.saveButton).should('not.have.attr', 'disabled');
        cy.get(SELECTORS.saveButton).click({ force: true });
        cy.waitForGraphQL('save');
    });

    Cypress.Commands.add('chooseCraMuiDatePicker', (label, dateOrDay, month, year) => {
        let day;
        if (dateOrDay && typeof dateOrDay === 'object') {
            if (dateOrDay instanceof Date) {
                day = dateOrDay.getDate();
                month = dateOrDay.getMonth() + 1;
                year = dateOrDay.getFullYear();
            } else {
                ({ day, month, year } = dateOrDay);
            }
        } else {
            day = dateOrDay;
        }

        cy.contains('label', label)
            .closest('.MuiFormControl-root')
            .find('input')
            .click({ force: true })

        cy.get('.MuiPickersModal-dialogRoot').should('be.visible');

        if (month || year) {
            cy.get('.MuiPickersCalendarHeader-transitionContainer p').then(($header) => {
                const headerText = $header.text();

                const months = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                ];

                const currentMonth = months.findIndex((m) => headerText.includes(m)) + 1;
                const currentYear = parseInt(headerText.match(/\d{4}/)?.[0]);

                const targetMonth = month ?? currentMonth;
                const targetYear = year ?? currentYear;

                const diff =
                    (targetYear - currentYear) * 12 + (targetMonth - currentMonth);

                const navSelector = diff > 0
                    ? '.MuiPickersCalendarHeader-iconButton:last-child'
                    : '.MuiPickersCalendarHeader-iconButton:first-child';

                Cypress._.times(Math.abs(diff), () => {
                    cy.get(navSelector).click();
                    cy.get('.MuiPickersCalendarHeader-transitionContainer').should('not.have.class', 'MuiPickersSlideTransition-slideEnter');
                });
            });
        }

        cy.get('.MuiPickersCalendar-transitionContainer')
            .find('.MuiPickersDay-day:not(.MuiPickersDay-hidden)')
            .each(($el) => {
                if ($el.find('p').text().trim() === String(day)) {
                    cy.wrap($el).click();
                    return false;
                }
            });

        cy.get('.MuiPickersModal-withAdditionalAction')
            .contains('button', 'OK')
            .click();
    });

    Cypress.Commands.add('chooseServiceAutocomplete', (element, index) => {
        if (element.name) {
            cy.get('input[placeholder="Search Service…"]').eq(index)
                .clear().type(element.name);
        } else {
            cy.get('input[placeholder="Search Service…"]').eq(index)
                .clear().type(" ");
        }
        cy.get('.MuiAutocomplete-popper').should('be.visible')
            .find('li').first().click();

    });

    Cypress.Commands.add('chooseComplexServiceAutocomplete', (service, index) => {
        cy.get('input[placeholder="Search Service…"]')
            .eq(index)
            .clear()
            .type(service.name);

        cy.waitForGraphQL('search service');

        cy.get('.MuiAutocomplete-popper')
            .should('be.visible')
            .find('li')
            .first()
            .click();

        service.subservicesItems.forEach((subservice) => {
            cy.get(`input[value="${subservice.code}"]`)
                .closest('tr')
                .within(() => {
                    cy.get('input:not([disabled])')
                        .first()
                        .clear()
                        .type(subservice.qty);
                });
        });

    });

    Cypress.Commands.add('searchInput', (label, value) => {
        cy.enterMuiInput(label, value, 'input');
        cy.contains('button', 'Search').click({ force: true });
        cy.waitForGraphQL('search');
        cy.get(SELECTORS.table).should('be.visible');
    });

    Cypress.Commands.add('goToClaimForm', () => {
        cy.get(SELECTORS.addIcon).click({ force: true });
    });

    Cypress.Commands.add('openRow', (label, value) => {
        cy.contains('td', value)
            .closest('tr')
            .dblclick();
        cy.contains('label', label)
            .closest('.MuiFormControl-root')
            .find('input')
            .should('have.value', value);
    });

    Cypress.Commands.add('duplicate', () => {
        cy.get(SELECTORS.duplicateButton).click({ force: true });
    });

    Cypress.Commands.add('filterInputValue', (identifier, value) => {
        cy.contains('button', 'Reset filters').click({ force: true });
        cy.enterMuiInput(identifier, value);
        cy.contains('button', 'Search').click({ force: true });
        cy.waitForGraphQL('search');
    });

    Cypress.Commands.add('verifyInput', (labelText, expectedValue) => {
        cy.contains('label', labelText)
            .closest('.MuiFormControl-root')
            .find('input')
            .should('have.value', expectedValue);
    });

    Cypress.Commands.add('verifySubServiceItemsQty', (subServiceItems) => {
        subServiceItems.forEach((subElt) => {
            cy.get(`input[value="${subElt.code}"]`)
                .closest('tr')
                .within(() => {
                    cy.get('input:not([disabled])')
                        .first()
                        .should('have.value', String(subElt.qty));
                });
        })
    })

    Cypress.Commands.add('verifyComplexServiceRow', (rowIndex, service, totalRows) => {
        const reversedIndex = totalRows - 1 - rowIndex;
        const row = () => cy.contains('p', 'Services')
            .should('be.visible')
            .closest('.MuiBox-root')
            .find('.MuiBox-root > table tr')
            .not(':first-child')
            .eq(reversedIndex);

        row()
            .find('input[placeholder="Search Service…"]')
            .should('include.value', service.name);

        cy.verifySubServiceItemsQty(service.subservicesItems);
    });

    Cypress.Commands.add('restoreClaim', (newCode) => {
        cy.get(SELECTORS.restoreButton).click({ force: true });;
        cy.enterMuiInput('Claim No.', newCode);
        cy.contains(`Claim ${newCode}`).should('be.visible');
        cy.save();
    });

    Cypress.Commands.add('verifyClaim', (code) => {
        cy.goToList('Claims', 'Health Facility Claims');
        cy.contains('button', 'Reset filters').click({ force: true });
        cy.searchInput('Claim No.', code);
        cy.contains('td', code).should('be.visible');
    });

    Cypress.Commands.add('searchClaim', (claim) => {
        cy.goToList('Claims', 'Health Facility Claims');
        cy.searchInput('Claim No.', claim.code);
    });

    Cypress.Commands.add('duplicateClaim', (claim) => {
        cy.duplicate();
        cy.enterMuiInput('Insurance No.', claim.chfId);
        cy.enterMuiInput('Claim No.', claim.code);
        cy.save();
    });

    Cypress.Commands.add('fillClaim', (claim, type) => {
        cy.enterMuiInput('Insurance No.', claim.chfId);
        cy.chooseCraMuiDatePicker('Visit Date To');
        cy.chooseMuiAutocomplete('Main Diagnosis');
        cy.enterMuiInput('Claim No.', claim.code);
        if (type == 'simple') {
            cy.chooseServiceAutocomplete("", index);
        } else {
            claim.services.forEach((service, index) => {
                cy.chooseComplexServiceAutocomplete(service, 0);
            });
        }
    });

    Cypress.Commands.add('createClaim', (claim, type) => {
        cy.goToClaimForm();
        cy.fillClaim(claim, type);
        cy.save();
    });

    Cypress.Commands.add('verifyContent', (claim) => {
        const inputFields = [
            ['Claim No.', claim.code],
            ['Insurance No.', claim.chfId]
        ];

        inputFields.forEach(([label, expectedValue]) => cy.verifyInput(label, expectedValue));
        claim.services.forEach((service, index) => {
            cy.verifyComplexServiceRow(index, service, claim.services.length);
        });
    });
}