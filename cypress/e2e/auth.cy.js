describe('Unauthenticated', () => {
  it('Shows the login screen (OCM-1125, OCM-1126)', () => {
    cy.visit('/')
    cy.contains('Username')
    cy.contains('Password')
    cy.get('input[type="password"]').should('be.visible')
    cy.contains('button', 'Log In')
    cy.contains('button', 'Log In').should('be.disabled')
  })
})

describe('Sign in and out', () => {
  beforeEach(function () {
    cy.visit('/');
    cy.fixture('cred').then((cred) => {
      this.cred = cred
    })
  });

  it('Signs in and out the admin user (OCM-1122)', function () {
    cy.get('input[type="text"]').type(this.cred.username)
    cy.get('input[type="password"]').type(this.cred.password)
    cy.get('button[type="submit"]').click()
    cy.contains('Welcome Admin Admin!')

    cy.get('button[title="Log out"]').click()
    cy.contains('button', 'Log In')
  })

  it('Rejects non-existent username (OCM-1123)', function () {
    cy.get('input[type="text"]').type(this.cred.username + 'asdf')
    cy.get('input[type="password"]').type(this.cred.password)
    cy.get('button[type="submit"]').click()

    cy.contains("The password or the username you've entered is incorrect.")
    cy.contains('button', 'Log In')
  })

  it('Rejects incorrect password (OCM-1124)', function () {
    cy.get('input[type="text"]').type(this.cred.username)
    cy.get('input[type="password"]').type(this.cred.password + 'asdf')
    cy.get('button[type="submit"]').click()

    cy.contains("The password or the username you've entered is incorrect.")
    cy.contains('button', 'Log In')
  })
})

