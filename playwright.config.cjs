const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: process.env.WU_CHROME_PATH ? { executablePath: process.env.WU_CHROME_PATH } : {},
    serviceWorkers: 'block'
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory docs',
    url: 'http://127.0.0.1:4173', reuseExistingServer: false
  }
});
