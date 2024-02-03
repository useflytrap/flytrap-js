import { join } from "path";
import { createNextTest, expect } from "../fixture";
import { fetchCaptures, getDirname, getLatestCapture, wait } from "../utils";

const { test } = createNextTest({
	path: join(getDirname(import.meta.url), '..', '..', 'examples', 'with-nextjs-api'),
  port: 3000,
  id: 'next-backend',
  debug: true,
  ...(process.env.CI === undefined && {
    dependencies: {
      "useflytrap": `link:${join(getDirname(import.meta.url), '..', '..')}`
    }
  })
})

test("captures backend bug in next.js", async ({ page }) => {
	const startTime = new Date();
  const capturesBefore = await fetchCaptures('sk_3X-otNR_ZxIdw8cVxNbFcDivQF9B5Vw_bGu564jR35GMyVXX');
  
	await page.goto("/");
  await page.reload()
  await wait(3_000)

  // Find the input
  await page.locator('input').fill('user-1');

  // Click the submit button
  await page.click('text=Fetch')

  await wait(3_000)

  // ^^ Happy path, we don't expect anything
  const capturesDuring = await fetchCaptures('sk_3X-otNR_ZxIdw8cVxNbFcDivQF9B5Vw_bGu564jR35GMyVXX');
  expect(capturesBefore.length).toBe(capturesDuring.length)

  // Now error path

  // Find the input
  await page.locator('input').fill('user-51');

  // Click the submit button
  await page.click('text=Fetch')

  await wait(5_000)

  const capturesAfter = await fetchCaptures('sk_3X-otNR_ZxIdw8cVxNbFcDivQF9B5Vw_bGu564jR35GMyVXX');
  const latestCapture = getLatestCapture(capturesAfter, startTime)
  expect(latestCapture.capturedUserId).toEqual('user-51');
  expect(latestCapture.functionName).toEqual('/api/user invariant state, user not found.');
  expect(capturesAfter.length).toBeGreaterThan(capturesBefore.length);
})

// @todo: capture visualization tests
