import './commands'

before(() => {
  cy.task('checkSetup').then((completed) => {
    if (!completed) {
      cy.task('completeSetup')
    }
  })
})

after(() => {
  cy.task('removeSetupFile')
})

