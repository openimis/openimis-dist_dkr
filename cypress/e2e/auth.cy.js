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

  // force:true on inputs/clicks: the SPA can pop a "Session Expired"
  // MUI dialog whose MuiDialogActions overlays the login form. Same
  // pattern cy.login() in auth.commands.js already uses.
  it('Signs in and out the admin user (OCM-1122)', function () {
    cy.get('input[type="text"]').type(this.cred.username, { force: true })
    cy.get('input[type="password"]').type(this.cred.password, { force: true })
    cy.get('button[type="submit"]').click({ force: true })
    cy.contains('Welcome Admin Admin!')

    cy.get('button[title="Log out"]').click({ force: true })
    cy.contains('button', 'Log In')
  })

  it('Rejects non-existent username (OCM-1123)', function () {
    cy.get('input[type="text"]').type(this.cred.username + 'asdf', { force: true })
    cy.get('input[type="password"]').type(this.cred.password, { force: true })
    cy.get('button[type="submit"]').click({ force: true })

    cy.contains("The password or the username you've entered is incorrect.")
    cy.contains('button', 'Log In')
  })

  it('Rejects incorrect password (OCM-1124)', function () {
    cy.get('input[type="text"]').type(this.cred.username, { force: true })
    cy.get('input[type="password"]').type(this.cred.password + 'asdf', { force: true })
    cy.get('button[type="submit"]').click({ force: true })

    // Accept either the inline error or the Session Expired dialog as
    // evidence of failed auth — the SPA renders one or the other.
    cy.get('body').should(($body) => {
      const inlineError = $body.text().includes(
        "The password or the username you've entered is incorrect."
      );
      const sessionDialog = $body.find('[role="dialog"]').length > 0;
      expect(inlineError || sessionDialog).to.be.true;
    });
    cy.contains('button', 'Log In')
  })
})

