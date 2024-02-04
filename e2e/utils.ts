import { Page } from "@playwright/test";
import { execa } from "execa";
import { readFileSync, writeFileSync } from "fs";
import { copy } from "fs-extra";
import { tmpdir } from "os";
import { dirname, join } from "path";
import type { PackageJson } from "type-fest";
import { fileURLToPath } from "url";

export const wait = (time: number) => new Promise((resolve) => setTimeout(resolve, time))
export const getBaseUrl = (port: number) => `http://localhost:${port}`;
export const getApiBaseUrl = () => 'https://www.useflytrap.com';
export const getDirname = (importMetaUrl: string) => dirname(fileURLToPath(importMetaUrl))

export async function pnpmInstall(installDir: string, showStdout = false) {
	return new Promise(async (resolve, reject) => {
		const subprocess = execa('pnpm', ['install'], {
			cwd: installDir,
		});

		if (showStdout) {
			subprocess.stdout?.on('data', (data: string | Buffer) => console.log(data.toString()))
		}
		subprocess.stderr?.on('data', reject)
	
		subprocess.stdout?.on('data', (data: string | Buffer) => {
			if (data.toString().includes("Done in")) {
				subprocess.kill()
				resolve(undefined);
			}
		})
	})
}

export async function createTempTestFolder(testSourcePath: string) {
	const tempPath = `flytrap_install_${Math.floor(Math.random() * 1_000_000_000)}`;
	const tempTestPath = join(tmpdir(), tempPath)

	await copy(testSourcePath, tempTestPath)
	return tempTestPath
}

export function mergePackageJson(tempTestPath: string, updatedPackageJson: PackageJson.PackageJsonStandard) {
	const packageJsonPath = join(tempTestPath, 'package.json')
	const packageJson = JSON.parse(readFileSync(packageJsonPath).toString())

	for (const [key, value] of Object.entries(updatedPackageJson)) {
		if (value === undefined) continue
		if (typeof value === "object") {
			packageJson[key] = {
				...packageJson[key],
				...value
			}
		} else {
			throw new TypeError(`Value type "${typeof value}" is not supported by mergePackageJson()`);
		}
	}

	// Write the new package.json file
	writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

export async function fetchCaptures(secretApiKey: string): Promise<any[]> {
	const response = await (await fetch(`${getApiBaseUrl()}/api/v1/captures`, {
		headers: new Headers({
			Authorization: `Bearer ${secretApiKey}`
		})
	})).json()
	return response as any[]
}

export function getLatestCapture(captures: any[], testStartTime: Date): any | undefined {
	return captures.find((capture) => new Date(capture.createdAt).getTime() > testStartTime.getTime());
}

export async function getNextConsoleLogs(page: Page) {
	const consolePromise = await page.waitForEvent('console');
  const consoleLogsArgs = await consolePromise.args()

	const consoleLogJsonValues = await Promise.all(
		consoleLogsArgs.map(async (c) => await c.jsonValue())
	)

	return consoleLogJsonValues.join('\n');
}
