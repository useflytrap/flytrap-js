import { test, expect } from '@playwright/test'
import { NEXTJS_API_PORT, NEXTJS_PORT, NUXT_PORT, SVELTE_PORT, fetchCaptures, getBaseUrl, getLatestCapture, waitMs } from './util'
import { join } from 'path'
import { existsSync, rmSync } from 'fs'

test.afterAll(() => {
  // Delete cache directories
  const cacheDirectories = [
    join(process.cwd(), 'examples', 'with-nextjs', '.next'),
    join(process.cwd(), 'examples', 'with-nextjs-api', '.next')
  ]
  cacheDirectories.forEach((cacheFilePath) => {
    if (existsSync(cacheFilePath)) {
      rmSync(cacheFilePath, { recursive: true })
    }
  })
})

test('should capture back-end bug in nextjs-api example', async ({ page }) => {
  const startTime = new Date();
  const capturesBefore = await fetchCaptures('sk_3X-otNR_ZxIdw8cVxNbFcDivQF9B5Vw_bGu564jR35GMyVXX');
  // Start from the index page (the baseURL is set via the webServer in the playwright.config.ts)
  await page.goto(getBaseUrl(NEXTJS_API_PORT));
  await page.reload()
  await waitMs(3_000)

  // Find the input
  await page.locator('input').fill('user-1');

  // Click the submit button
  await page.click('text=Fetch')

  await waitMs(3_000)

  // ^^ Happy path, we don't expect anything
  const capturesDuring = await fetchCaptures('sk_3X-otNR_ZxIdw8cVxNbFcDivQF9B5Vw_bGu564jR35GMyVXX');
  expect(capturesBefore.length).toBe(capturesDuring.length)

  // Now error path

  // Find the input
  await page.locator('input').fill('user-51');

  // Click the submit button
  await page.click('text=Fetch')

  await waitMs(5_000)

  const capturesAfter = await fetchCaptures('sk_3X-otNR_ZxIdw8cVxNbFcDivQF9B5Vw_bGu564jR35GMyVXX');
  const latestCapture = getLatestCapture(capturesAfter, startTime)
  expect(latestCapture.capturedUserId).toEqual('user-51');
  expect(latestCapture.functionName).toEqual('User not found');
  expect(capturesAfter.length).toBeGreaterThan(capturesBefore.length);
})

// @todo: refactor the client-side e2e

test('should capture front-end bug in nextjs example', async ({ page }) => {
  const startTime = new Date();
  const capturesBefore = await fetchCaptures('sk_Y8dYLe5VoNJfDI_CPEqF8AqMTEwWAvTwBi7Ml-pN9bzWsgsP');
  // Start from the index page (the baseURL is set via the webServer in the playwright.config.ts)
  await page.goto(getBaseUrl(NEXTJS_PORT));
  await page.reload()

  // Find the input
  await page.locator('input').fill('wrong')

  // Click the submit button
  await page.click('text=Submit')

  // Wait for some console .log
  const consolePromise = await page.waitForEvent('console');
  const consoleLogsArgs = await consolePromise.args()
  // expect(await consoleLogsArgs[0]?.jsonValue()).toContain('[🐛 post] https://www.useflytrap.com/api/v1/captures')

  await waitMs(10_000);

  // Check the API for the capture
  const capturesAfter = await fetchCaptures('sk_Y8dYLe5VoNJfDI_CPEqF8AqMTEwWAvTwBi7Ml-pN9bzWsgsP');
  const latestCapture = getLatestCapture(capturesAfter, startTime)
  expect(latestCapture?.functionName).toEqual('Input value "wrong" is wrong!')
  expect(capturesAfter.length).toBeGreaterThan(capturesBefore.length)
})


test('should capture front-end bug in sveltekit example', async ({ page }) => {
  const startTime = new Date();
  const capturesBefore = await fetchCaptures('sk_K8zYjKVWq6himuvhrPROShSjsWwAsseEY7K4Y9GZsYTwNxLt');
  // Start from the index page (the baseURL is set via the webServer in the playwright.config.ts)
  await page.goto(getBaseUrl(SVELTE_PORT));
  await page.reload()
  await waitMs(1000)

  // Find the input
  await page.locator('input').fill('wrong')
  await waitMs(1000)

  // Click the submit button
  await page.click('text=Submit')
  const consolePromise = await page.waitForEvent('console')
  const consoleArgs = await consolePromise.args();
  
  expect(await consoleArgs[0]?.jsonValue()).toContain('[🐛 post] https://www.useflytrap.com/api/v1/captures')
  await waitMs(3_000);

  // Check the API for the capture
  const capturesAfter = await fetchCaptures('sk_K8zYjKVWq6himuvhrPROShSjsWwAsseEY7K4Y9GZsYTwNxLt');
  const latestCapture = getLatestCapture(capturesAfter, startTime)
  expect(latestCapture?.functionName).toEqual('Input value "wrong" is wrong!')
  expect(capturesAfter.length).toBeGreaterThan(capturesBefore.length);
})

test('should capture front-end bug in nuxt example', async ({ page }) => {
  const startTime = new Date();
  const capturesBefore = await fetchCaptures('sk_TnBe2CSBNPGE-9jDtiQDvaoef8LOJ17T_xpIvKxVcBJuskGX');
  // Start from the index page (the baseURL is set via the webServer in the playwright.config.ts)
  await page.goto(getBaseUrl(NUXT_PORT));
  await page.reload()
  await waitMs(1000)

  // Find the input
  await page.locator('input').fill('wrong')
  await waitMs(1000)

  // Click the submit button
  await page.click('text=Submit')
  const consolePromise = await page.waitForEvent('console')
  const consoleArgs = await consolePromise.args();
  
  expect(await consoleArgs[0]?.jsonValue()).toContain('[🐛 post] https://www.useflytrap.com/api/v1/captures')
  await waitMs(3_000);

  // Check the API for the capture
  const capturesAfter = await fetchCaptures('sk_TnBe2CSBNPGE-9jDtiQDvaoef8LOJ17T_xpIvKxVcBJuskGX');
  const latestCapture = getLatestCapture(capturesAfter, startTime)
  expect(latestCapture?.functionName).toEqual('Input value "wrong" is wrong!')
  expect(capturesAfter.length).toBeGreaterThan(capturesBefore.length);
})

test.skip('should navigate to the about page', async ({ page }) => {
  // Start from the index page (the baseURL is set via the webServer in the playwright.config.ts)
  await page.goto('/')
  // Find an element with the text 'About Page' and click on it
  await page.click('text=About Page')
  // The new url should be "/about" (baseURL is used there)
  await expect(page).toHaveURL('/about')
  // The new page should contain an h1 with "About Page"
  await expect(page.locator('h1')).toContainText('About Page')
})