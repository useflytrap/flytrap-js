import { expect, test } from "@playwright/test";
import { REPLAY_NEXTJS_PORT, getBaseUrl, waitMs } from "./util";

test.only('should replay front-end bug in nextjs example', async ({ page }) => {
	// const capturesBefore = await fetchCaptures('sk_Y8dYLe5VoNJfDI_CPEqF8AqMTEwWAvTwBi7Ml-pN9bzWsgsP');
	// Start from the index page (the baseURL is set via the webServer in the playwright.config.ts)
  await page.goto(getBaseUrl(REPLAY_NEXTJS_PORT));
	await waitMs(3_000)

	// Reload the page
	await page.reload()

	// Find input and make sure the content is replayed
	await expect(page.locator('input')).toHaveValue('wrong')

	// Then, click on the "Submit ", and expect error popup to show up
  await page.click('text=Submit')

	// Click on error popup
	await page.locator('text=error').click()
	await expect(page.locator('#nextjs__container_errors_desc')).toContainText('Error: Input value "wrong" is wrong!');
});
