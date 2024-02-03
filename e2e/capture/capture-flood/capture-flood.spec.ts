import { join } from "path";
import { createNextTest } from "../../fixture";
import { expect } from '@playwright/test'
import { getDirname } from "../../utils";

const { test } = createNextTest({
	path: join(getDirname(import.meta.url), 'app'),
	port: 3004,
	dependencies: {
		"useflytrap": `link:${join(getDirname(import.meta.url), '..', '..', '..')}`
	}
})

test("flood of captures are ignored and doesn't affect app performance", async ({ page }) => {
	await page.goto('/');

	// Get the initial value of the counter
  const initialCounterValue = await page.getByRole('paragraph').textContent()

	if (initialCounterValue === null) {
		throw new Error(`Counter is null`)
	}

	// Trigger flood of captures
	await page.getByRole('button', { name: 'Trigger flood' }).click()

	// Then, click the increment button
	await page.getByRole('button', { name: 'Increment' }).click()

  // Get the updated value of the counter
  const updatedCounterValue = await page.getByRole("paragraph").textContent()

  // Check if the counter has incremented
  expect(updatedCounterValue).not.toBe(initialCounterValue);
})
