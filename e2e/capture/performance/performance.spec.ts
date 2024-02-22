import { join } from "path";
import { createNextTest } from "../../fixture";
import { assertAbsolutePeformance, getDirname, wait } from "../../utils";
import ms from "ms";

const { test } = createNextTest({
	path: join(getDirname(import.meta.url), 'app'),
	port: 3007,
	showStdout: true,
	id: "performance",
	debug: true,
	timeout: ms('5 minutes'),
	...(process.env.CI === undefined && {
		dependencies: {
			"useflytrap": `link:${join(getDirname(import.meta.url), '..', '..', '..')}`
		}
	})
})

type ProfilerMetric = {
	id: string;
	phase: string;
	actualDuration: number;
	baseDuration: number
	startTime: number
	commitTime: number
}

const parseProfilerMetric = (log: string): ProfilerMetric | undefined => {
	try {
		const possiblyMetric: unknown = JSON.parse(log)
		if (typeof possiblyMetric !== "object") return undefined
		if (Object.keys(possiblyMetric as object).every((key) => ["id", "phase", "actualDuration", "baseDuration", "startTime", "commitTime"].includes(key))) {
			return possiblyMetric as ProfilerMetric
		}
	} catch {}
	return undefined
}


test("time-to-(mount | update | nested-update)", async ({ page }) => {
	// baseline on Apple Macbook Pro M2
	const baseline = {
		'mount': 56.40000008046627,
		'update': 54.40000008046627,
		'nested-update': 54.60000006854534,
	};

	const profilerEntries: Record<string, number> = {}

	page.on("console", (log) => {
		const metric = parseProfilerMetric(log.text())
		if (metric) {
			profilerEntries[metric.phase] = metric.baseDuration
		}
	})

	await page.goto('/sink-with-data');

	// Flush out the rest of the Web Vitals metrics
	await page.getByRole('button', { name: 'Button' }).click()

	await wait(60_000)

	// Assert performance, absolute tolerance 10 ms
	assertAbsolutePeformance(baseline, profilerEntries, 10);
})

test("time-to-click-handled", async ({ page }) => {
	const baseline = {
		'click-handled': 40.09999999962747,
	};

	const profilerEntries: Record<string, number> = {}
	page.on("console", (log) => {
		const metric = parseProfilerMetric(log.text())
		if (metric && metric.phase === 'click-handled') {
			profilerEntries[metric.phase] = metric.baseDuration
		}
	})

	await page.goto('/sink-with-data/click-handling');
	await page.getByRole('button', { name: 'Button' }).click()

	await wait(60_000)

	assertAbsolutePeformance(baseline, profilerEntries, 10);
})
