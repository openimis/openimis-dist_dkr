export class UserPage {
    addUser(user) {
        cy.goToList('Administration', 'Users');
        cy.goToForm('');
        this.fillForm(user);
        cy.save();
    }

    searchUser(username) {
        cy.goToList('Administration', 'Users');
        cy.searchInput('User name', username);
        cy.contains('td', username).should('be.visible');
    }

    verifyUser(user){
        this.searchUser(user.username);
        cy.openRow('User name', user.username);
        const inputFields = [
            ['User name', user.username],
            ['Last name', user.lastname],
            ['Given names', user.givenname],
            ['Email', user.email],
            ['Phone', user.phone]
        ];
        const selectFields = [
            'Health Facility',
            'User role(s)',
            'Regions',
            'Districts',
            'Interface Language'
        ];
        inputFields.forEach(([label, expectedValue]) => cy.verifyInput(label, expectedValue));
        selectFields.forEach((label) => cy.verifySelect(label));
    }

    updateUser(label, value){
        cy.enterMuiInput(label, value);
        cy.save();
    }

    deleteUser(username) {
        this.searchUser(username);
        cy.delete('user(s) found', username, 'Ok');
    }

    fillForm(user){
        cy.enterMuiInput('User name', user.username);
        cy.enterMuiInput('Last name', user.lastname);
        cy.enterMuiInput('Given names', user.givenname);
        cy.enterMuiInput('Email', user.email);
        cy.enterMuiInput('Phone', user.phone);
        cy.selectFirstAutocomplete(0);
        cy.selectMultipleAutocomplete(1, user.roles);
        cy.selectFirstAutocomplete(2);
        cy.selectDropdown('Interface Language');
        cy.enterMuiInput('New Password', user.password);
        cy.enterMuiInput('Confirm Password', user.password);
    }

    filterByVillage(){
        cy.goToList('Administration', 'Users');
        cy.filterValue('Village');
    }
}