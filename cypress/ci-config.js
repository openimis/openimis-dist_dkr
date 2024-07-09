const { defineConfig } = require("cypress");

module.exports = defineConfig({
  projectId: "q6gc25",
  e2e: {
    baseUrl: 'http://localhost/front/',
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
