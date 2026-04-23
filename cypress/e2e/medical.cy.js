import { ServicePage } from "../support/pages/servicePage";

describe('Complex Service workflow', () => {
    let data;
    const servicePage = new ServicePage();

    before(() => {
        cy.fixture('medicalService').then((fixture) => {
            data = fixture;
        });
    });

    beforeEach(() => {
        cy.login();
    })

    afterEach(function () {
        if (this.currentTest.state === 'failed') return;
        servicePage.deleteService(data.service.code);
    });

    it('Complex service workflow', () => {
        servicePage.addService(data.service);
        servicePage.verifyService(data.service);
        servicePage.updateService('Name', "Paracétamol");
    })
})