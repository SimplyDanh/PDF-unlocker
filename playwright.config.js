module.exports = {
  testDir: './tests/e2e',
  workers: 2,
  webServer: {
    command: 'npx serve -p 3000 .',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
};
