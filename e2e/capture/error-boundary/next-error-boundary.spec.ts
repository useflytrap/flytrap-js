import { join } from "path";
import { createNextTest } from "../../fixture";
import { expect } from '@playwright/test'
import { fetchCaptures, getApiBaseUrl, getDirname, getLatestCapture, getNextConsoleLogs, wait } from "../../utils";

const { test } = createNextTest({
	path: join(getDirname(import.meta.url), 'app'),
	port: 3005,
	id: 'error-boundary',
	dependencies: {
		"useflytrap": `link:${join(getDirname(import.meta.url), '..', '..', '..')}`
	}
})

test("server component error boundary sends captures", async ({ page }) => {
	const startTime = new Date();
  const capturesBefore = await fetchCaptures('sk_XnTKeX1ozIcTYZj0iqMNDc3DT-zsem1XWwDkEoydjkCumZIZ');

	// Trigger error
	await page.goto('/server-component');

	// Verify error boundary rendered
	expect(await page.getByRole("heading").textContent()).toBe("Server Component Error Boundary")

	await wait(3_000)

	// Check the API for the capture
	const capturesAfter = await fetchCaptures('sk_XnTKeX1ozIcTYZj0iqMNDc3DT-zsem1XWwDkEoydjkCumZIZ');
  const latestCapture = getLatestCapture(capturesAfter, startTime)
  expect(latestCapture?.functionName).toEqual('Server Component Error')
  expect(capturesAfter.length).toBeGreaterThan(capturesBefore.length)
})

test("nested routes error boundary", async ({ page }) => {
	const startTime = new Date();
  const capturesBefore = await fetchCaptures('sk_XnTKeX1ozIcTYZj0iqMNDc3DT-zsem1XWwDkEoydjkCumZIZ');

	await page.goto("/nested")

	// Trigger error
	await page.getByRole("button", { name: "Trigger error boundary" }).click();

	// Verify error boundary rendered
	// @note: Client error boundaries don't work for some reason. Refer to https://github.com/vercel/next.js/issues/50987
	// expect(await page.getByRole("heading").textContent()).toBe("Root Page Error Boundary")

	// Verify capture logs
  const consoleLogs = await getNextConsoleLogs(page)
  expect(consoleLogs).toContain(`[POST] ${getApiBaseUrl()}/api/v1/captures`)

	await wait(3_000)

	// Check the API for the capture
	const capturesAfter = await fetchCaptures('sk_XnTKeX1ozIcTYZj0iqMNDc3DT-zsem1XWwDkEoydjkCumZIZ');
  const latestCapture = getLatestCapture(capturesAfter, startTime)
  expect(latestCapture?.functionName).toEqual('Nested Page Error')
  expect(capturesAfter.length).toBeGreaterThan(capturesBefore.length)
})
