import { join } from "path";
import { createNextTest, expect } from "../fixture";
import { fetchCaptures, getApiBaseUrl, getDirname, getLatestCapture, getNextConsoleLogs, wait } from "../utils";

const { test } = createNextTest({
	path: join(getDirname(import.meta.url), '..', '..', 'examples', 'with-nuxt'),
	port: 3002,
	serverReadyString: 'warmed up',
  id: 'nuxt-frontend',
  debug: true,
  ...(process.env.CI === undefined && {
    dependencies: {
      "useflytrap": `link:${join(getDirname(import.meta.url), '..', '..')}`
    }
  })
})

test("captures frontend bug in nuxt", async ({ page }) => {
	const startTime = new Date();
  const capturesBefore = await fetchCaptures('sk_TnBe2CSBNPGE-9jDtiQDvaoef8LOJ17T_xpIvKxVcBJuskGX');
  await page.goto("/");
  await page.reload()
  await wait(3_000)

  // Find the input
  await page.locator('input').fill('wrong')
  await wait(1000)

  // Click the submit button
  await page.click('text=Submit')
	const consoleLogs = await getNextConsoleLogs(page)
	expect(consoleLogs).toContain(`[POST] ${getApiBaseUrl()}/api/v1/captures`)
  
	await wait(3_000);

  // Check the API for the capture
  const capturesAfter = await fetchCaptures('sk_TnBe2CSBNPGE-9jDtiQDvaoef8LOJ17T_xpIvKxVcBJuskGX');
  const latestCapture = getLatestCapture(capturesAfter, startTime)
  expect(latestCapture?.functionName).toEqual('Input value "wrong" is wrong!')
  expect(capturesAfter.length).toBeGreaterThan(capturesBefore.length);
})

// @todo: capture visualization tests
