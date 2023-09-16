import { PlaywrightTestConfig, devices } from '@playwright/test'
import path, { join } from 'path'
import { fileURLToPath } from 'url';
import { NEXTJS_API_PORT, NEXTJS_PORT, NUXT_PORT, REPLAY_NEXTJS_PORT, SVELTE_PORT } from './e2e/util';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Use process.env.PORT by default and fallback to port 3000
const PORT = process.env.PORT || 3000

// Set webServer.url and use.baseURL with the location of the WebServer respecting the correct set port
const baseURL = `http://localhost:${PORT}`

// Reference: https://playwright.dev/docs/test-configuration
const config: PlaywrightTestConfig = {
  // Timeout per test
  timeout: 30 * 1000,
  // Test directory
  testDir: path.join(__dirname, 'e2e'),
  // If a test fails, retry it additional 2 times
	retries: process.env.CI ? 2 : 0,
  // Artifacts folder where screenshots, videos, and traces are stored.
  outputDir: 'test-results/',

  forbidOnly: !!process.env.CI,

  // Run your local dev server before starting the tests:
  // https://playwright.dev/docs/test-advanced#launching-a-development-web-server-during-the-tests
	webServer: [
    // Capture examples
		{
			command: 'pnpm run dev',
			cwd: join(__dirname, 'examples', 'with-nextjs-api'),
			port: NEXTJS_API_PORT,
			env: {
				PORT: NEXTJS_API_PORT.toString()
			},
			timeout: 120 * 1000,
			reuseExistingServer: !process.env.CI,
		},
		{
			command: 'pnpm run dev',
			cwd: join(__dirname, 'examples', 'with-nextjs'),
			port: NEXTJS_PORT,
			env: {
				PORT: NEXTJS_PORT.toString()
			},
			timeout: 120 * 1000,
			reuseExistingServer: !process.env.CI,
		},
    {
      command: `pnpm run dev --port ${SVELTE_PORT}`,
			cwd: join(__dirname, 'examples', 'with-sveltekit'),
			port: SVELTE_PORT,
			env: {
				PORT: SVELTE_PORT.toString()
			},
			timeout: 120 * 1000,
			reuseExistingServer: !process.env.CI,
		},
    /* {
      command: `pnpm run dev`,
			cwd: join(__dirname, 'examples', 'with-nuxt'),
			port: NUXT_PORT,
			env: {
				PORT: NUXT_PORT.toString(),
			},
			timeout: 120 * 1000,
			reuseExistingServer: !process.env.CI,
		}, */
    // Replay examples
    {
			command: 'pnpm run dev',
			cwd: join(__dirname, 'examples', 'with-nextjs'),
			port: REPLAY_NEXTJS_PORT,
			env: {
				PORT: REPLAY_NEXTJS_PORT.toString(),
        FLYTRAP_MODE: 'replay',
        FLYTRAP_CAPTURE_ID: 'e75be9f6-ad3a-4c1d-9848-9dc50e74583e'
			},
			timeout: 120 * 1000,
			reuseExistingServer: !process.env.CI,
		},
	],

  use: {
    // Use baseURL so to make navigations relative.
    // More information: https://playwright.dev/docs/api/class-testoptions#test-options-base-url
    baseURL,
		// headless: false,

    // Retry a test if its failing with enabled tracing. This allows you to analyse the DOM, console logs, network traffic etc.
    // More information: https://playwright.dev/docs/trace-viewer
    trace: 'retry-with-trace',

    // All available context options: https://playwright.dev/docs/api/class-browser#browser-new-context
    // contextOptions: {
    //   ignoreHTTPSErrors: true,
    // },
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    // {
    //   name: 'Desktop Firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //   },
    // },
    // {
    //   name: 'Desktop Safari',
    //   use: {
    //     ...devices['Desktop Safari'],
    //   },
    // },
    // Test against mobile viewports.
    /* {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Safari',
      use: devices['iPhone 12'],
    }, */
  ],
}
export default config