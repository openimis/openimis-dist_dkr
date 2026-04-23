export class ServicePage {

    addService(service) {
        cy.goToList('Administration', 'Medical Services', 1);
        cy.goToForm('');
        this.fillForm(service);
        cy.save();
    }

    searchService(code) {
        cy.goToList('Administration', 'Medical Services', 1);
        cy.searchByCode(code);
        cy.contains('td', code).should('be.visible');
    }

    verifyService(service) {
        this.searchService(service.code);
        cy.openRow(service.code);
        const inputFields = [
            ['Code', service.code],
            ['Name', service.name],
            ['Frequency (days)', service.frequency]
        ];
        const selectFields = [
            ['Type', service.packageType],
            ['Service type', service.type],
            ['Service Category', service.category],
            ['Service Level', service.level],
            ['careType', service.careType]
        ]
        inputFields.forEach(([label, expectedValue]) => cy.verifyInput(label, expectedValue));
        selectFields.forEach(([label, expectedValue]) => cy.verifySelect(label, expectedValue));
        const subServices = service.subServices;
        const subItems = service.subItems;
        subServices.forEach((service, index) => {
            cy.verifyServiceRow(index, service, subServices.length);
        });
        subItems.forEach((item, index) => {
            cy.verifyItemRow(index, item, subItems.length);
        });
    }

    updateService(label, value) {
        cy.enterMuiInput(label, value);
        cy.save();
    }

    deleteService(code) {
        this.searchService(code);
        cy.delete('medical service(s) found', code);
        cy.searchByCode(code);
        cy.contains('td', code).should('not.exist');
    }

    fillForm(service) {
        cy.enterMuiInput("Code", service.code);
        cy.enterMuiInput("Name", service.name);
        cy.chooseMuiSelect('Type', service.packageType);
        cy.chooseMuiSelect('Service type', service.type);
        cy.chooseMuiSelect('Service Category', service.category);
        cy.chooseMuiSelect('Service Level', service.level);
        cy.chooseMuiSelect('careType', service.careType);
        cy.enterMuiInput("Frequency (days)", service.frequency);
        cy.fillSubServices(service.subServices);
        cy.fillSubItems(service.subItems);
    }
}