import { join } from "path";
import { createNextTest, expect } from "../fixture";
import { fetchCaptures, getApiBaseUrl, getDirname, getLatestCapture, getNextConsoleLogs, wait } from "../utils";


const { test } = createNextTest({
	path: join(getDirname(import.meta.url), '..', '..', 'examples', 'with-nextjs'),
	port: 3001,
	dependencies: {
		"useflytrap": `link:${join(getDirname(import.meta.url), '..', '..')}`
	}
})

test("captures frontend bug in next.js", async ({ page }) => {
	const startTime = new Date();
  const capturesBefore = await fetchCaptures('sk_Y8dYLe5VoNJfDI_CPEqF8AqMTEwWAvTwBi7Ml-pN9bzWsgsP');
  
	await page.goto('/');
  await page.reload()
  await wait(3_000)

  // Find the input
  await page.locator('input').fill('wrong')

  // Click the submit button
  await page.click('text=Submit')

  // Wait for some console.log
  const consoleLogs = await getNextConsoleLogs(page)
  expect(consoleLogs).toContain(`[POST] ${getApiBaseUrl()}/api/v1/captures`)

  await wait(3_000);

  // Check the API for the capture
  const capturesAfter = await fetchCaptures('sk_Y8dYLe5VoNJfDI_CPEqF8AqMTEwWAvTwBi7Ml-pN9bzWsgsP');
  const latestCapture = getLatestCapture(capturesAfter, startTime)
  expect(latestCapture?.functionName).toEqual('Input value "wrong" is wrong!')
  expect(capturesAfter.length).toBeGreaterThan(capturesBefore.length)
})

// @todo: capture visualization tests
