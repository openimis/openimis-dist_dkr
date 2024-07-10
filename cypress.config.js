const fs = require('fs')
const path = require('path')
const { defineConfig } = require("cypress")

const serverFlagPath = path.resolve(__dirname, 'serverStarted')

const payload = {
  "query": "{ moduleConfigurations { module, config, controls { field, usage } } }"
}
const timeout = 4 * 60 * 1000 // 4 minutes
const interval = 10000 // Check every 10 seconds

function waitForServerToStart(url) {
  console.log('Waiting for API server to start...')
  return new Promise((resolve, reject) => {
    const startTime = Date.now()

    function checkServer() {
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).then(response => {
          if (response.status === 200) {
            return resolve()
          } else {
            throw new Error(`Server responded with status ${response.status}`)
          }
        })
        .catch(error => {
          if (Date.now() - startTime >= timeout) {
            return reject(new Error('Timed out waiting for the server to start'))
          } else {
            console.log(`Retrying in ${interval / 1000} seconds...`)
            return setTimeout(checkServer, interval)
          }
        })
    }

    return checkServer()
  })
}

module.exports = defineConfig({
  e2e: {
    projectId: "q6gc25", // Cypress Cloud, needed for recording
    baseUrl: 'http://localhost/front',
    defaultCommandTimeout: 10000,
    taskTimeout: 300000,
    setupNodeEvents(on, config) {
      on('task', {
          checkSetup() {
            return fs.existsSync(serverFlagPath)
          },
          completeSetup() {
            const rootUrl = config.baseUrl.replace("/front", "") 
            const url = `${rootUrl}/api/graphql`
            return waitForServerToStart(url)
              .then(() => {
                console.log('Server is ready!')
                fs.writeFileSync(serverFlagPath, new Date().toString())
                return null
              })
              .catch(error => {
                console.error('Failed to start server:', error)
                return null
              })
          },
          removeSetupFile() {
            if (fs.existsSync(serverFlagPath)) {
              fs.unlinkSync(serverFlagPath)
            }
            return null
          }
      })
    },
  },
})
