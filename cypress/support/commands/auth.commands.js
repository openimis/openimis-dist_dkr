export function registerAuthCommands() {
  Cypress.Commands.add('login', () => {
    // Clear cookies so we always land on a clean login page regardless of
    // the state the previous test left the browser in.
    cy.clearCookies();
    cy.visit('/front/login');

    cy.get('body', { timeout: 30000 })
      .should(($body) => {
        const loggedIn = $body.find('button[title="Log out"]').length > 0
          || $body.text().includes('Welcome Admin Admin!');
        const onLoginPage = $body.find('input[type="password"]').length > 0
          || $body.find('button').toArray().some((el) => el.textContent.trim() === 'Log In');
        expect(
          loggedIn || onLoginPage,
          'frontend authenticated shell or login page should be visible',
        ).to.be.true;
      })
      .then(($body) => {
        const loggedIn = $body.find('button[title="Log out"]').length > 0
          || $body.text().includes('Welcome Admin Admin!');

        if (loggedIn) {
          return;
        }

        cy.fixture('cred').then((cred) => {
          // Use force:true — a "Session Expired" dialog may cover the
          // login form after an admin-interface logout.
          cy.get('input[type="text"]', { timeout: 15000 })
            .first()
            .clear({ force: true })
            .type(cred.username, { force: true });
          cy.get('input[type="password"]', { timeout: 15000 })
            .first()
            .clear({ force: true })
            .type(cred.password, { force: true });
          cy.get('button[type="submit"]').click({ force: true });
          cy.contains('Welcome Admin Admin!', { timeout: 15000 }).should('be.visible');
        });
      });
  });

  Cypress.Commands.add('logout', () => {
    cy.visit('/front');

    // Wait until the SPA has settled: either the logout button is in the navbar
    // (logged in) or the login form is visible (already logged out).
    cy.get('body', { timeout: 15000 })
      .should(($body) => {
        const loggedIn = $body.find('button[title="Log out"]').length > 0;
        const onLoginPage = $body.find('input[type="password"]').length > 0
          || $body.find('button').toArray().some((el) => el.textContent.trim() === 'Log In');
        expect(loggedIn || onLoginPage, 'app should show logout button or login form').to.be.true;
      })
      .then(($body) => {
        if ($body.find('button[title="Log out"]').length > 0) {
          cy.get('button[title="Log out"]').click();
          cy.contains('button', 'Log In', { timeout: 15000 }).should('be.visible');
          return;
        }

        // Already logged out — just confirm login state
        cy.visit('/front/login');
        cy.contains('button', 'Log In', { timeout: 15000 }).should('be.visible');
      });
  });

  Cypress.Commands.add('loginAdminInterface', () => {
    cy.visit('/api/admin');
    cy.fixture('cred').then((cred) => {
      cy.get('input[type="text"]').type(cred.username);
      cy.get('input[type="password"]').type(cred.password);
      cy.get('input[type="submit"]').click();
      cy.contains('Site administration').should('be.visible');
    });
  });

  Cypress.Commands.add('logoutAdminInterface', () => {
    cy.visit('/api/admin');
    cy.get('body', { timeout: 15000 }).then(($body) => {
      if ($body.find('button:contains("Log out"), a:contains("Log out")').length > 0) {
        cy.contains('button, a', 'Log out').click();
      }
    });
  });
}
