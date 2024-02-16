import { join } from "path";
import { createNextTest } from "../../fixture";
import { assertRelativePeformance, getDirname, wait } from "../../utils";
import ms from "ms";

const { test } = createNextTest({
	path: join(getDirname(import.meta.url), 'app'),
	port: 3006,
	showStdout: true,
	id: "web-vitals-performance",
	debug: true,
	production: true,
	timeout: ms('5 minutes'),
	...(process.env.CI === undefined && {
		dependencies: {
			"useflytrap": `link:${join(getDirname(import.meta.url), '..', '..', '..')}`
		}
	})
})

/**
 * Source: next.js/packages/next/src/shared/lib/utils.ts
 */
export const WEB_VITALS = ['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB'] as const
export type NextWebVitalsMetric = {
  id: string
	rating: "poor" | "something"
  startTime: number
  value: number
  attribution?: { [key: string]: unknown }
} & (
  | {
      label: 'web-vital'
      name: (typeof WEB_VITALS)[number]
    }
  | {
      label: 'custom'
      name:
        | 'Next.js-hydration'
        | 'Next.js-route-change-to-render'
        | 'Next.js-render'
    }
)

const parseWebVitalsMetric = (log: string): NextWebVitalsMetric | undefined => {
	try {
		const possiblyMetric: unknown = JSON.parse(log)

		if (WEB_VITALS.includes((possiblyMetric as any).name)) {
			return possiblyMetric as NextWebVitalsMetric
		}
	} catch {}
	return undefined
}

test("web vitals scores stay the same", async ({ page }) => {
	// baseline on Apple Macbook Pro M2
	const baseline = {
		FCP: 215.60000000149012,
		TTFB: 98.5,
		LCP: 215.60000000149012,
		FID: 1.0999999940395355
	}

	const realWebVitalsValues: Record<string, number> = {};

	page.on("console", (log) => {
		const metric = parseWebVitalsMetric(log.text())
		if (metric) {
			realWebVitalsValues[metric.name] = metric.value
		}
	})

	await page.goto('/sink-with-data');

	// Flush out the rest of the Web Vitals metrics
	await page.getByRole('button', { name: 'Button' }).click()

	await wait(60_000)

	// Assert baseline
	assertRelativePeformance(baseline, realWebVitalsValues)
})
