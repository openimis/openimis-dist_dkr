describe('Unauthenticated', () => {
  it('Shows the login screen', () => {
    cy.visit('')
    cy.contains('Username')
    cy.contains('Password')
    cy.contains('button', 'Log In')
  })
})

describe('Sign in and out', () => {
  beforeEach(function () {
    cy.visit('/');
    cy.fixture('cred').then((cred) => {
      this.cred = cred
    })
  });

  it('Signs in and out the admin user', function () {
    cy.get('input[type="text"]').type(this.cred.username)
    cy.get('input[type="password"]').type(this.cred.password)
    cy.get('button[type="submit"]').click()
    cy.contains('Welcome Admin Admin!')

    cy.get('button[title="Log out"]').click()
    cy.contains('button', 'Log In')
  })
})

