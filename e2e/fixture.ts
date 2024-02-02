import { test as baseTest } from '@playwright/test';
import { createTempTestFolder, mergePackageJson, pnpmInstall, wait } from './utils';
import { ExecaChildProcess, execa } from 'execa';
import { PackageJson } from 'type-fest';
import { rmSync } from 'fs';
import ms from 'ms';

export * from '@playwright/test';

export type NextTestOptions = {
  path: string;
  port?: number;
  serverReadyString?: string;
  showStdout?: boolean;
  timeout?: number;
} & Pick<PackageJson.PackageJsonStandard, 'dependencies'>;

export function createNextTest({
  path,
  timeout = ms("2 minutes"),
  port = 3000,
  dependencies,
  showStdout = false,
  serverReadyString = 'ready'
}: NextTestOptions) {
  let serverProcess: ExecaChildProcess<string> | undefined;
  let tempTestPath: string | undefined;

  const test = baseTest.extend<{}, { workerStorageState: string }>({
    // @todo: auth here…
    baseURL: `http://localhost:${port}`,
  })

  test.setTimeout(timeout)
  // baseTest.setTimeout(timeout)

  // Start Next.js dev server
  test.beforeAll(async ({}, testInfo) => {
    // console.log("TEST INFO", testInfo.timeout)
    // testInfo.setTimeout(120_000_000)
    testInfo.setTimeout(timeout)
    tempTestPath = await createTempTestFolder(path)

    // Patch dependencies
    mergePackageJson(tempTestPath, { dependencies });

    // Run install
    await pnpmInstall(tempTestPath, showStdout)

    // Start dev server
    serverProcess = execa("pnpm", ["dev"], {
      cwd: tempTestPath,
      env: {
        ...process.env,
        PORT: port.toString()
      }
    })

    if (showStdout) {
      serverProcess.stdout?.on('data', (data: Buffer | string) => console.log(data.toString()))
      serverProcess.stderr?.on('data', (data: Buffer | string) => console.error(data.toString()))
    }
    
    await new Promise<undefined>(resolve => {
      serverProcess?.stdout?.on('data', (data: string | Buffer) => {
        if (data.toString().toLowerCase().includes(serverReadyString)) {
          resolve(undefined);
        }
      });
    });
  })

  test.afterAll(async () => {
    serverProcess?.kill()
    try {
      if (tempTestPath) {
        await wait(1000)
        rmSync(tempTestPath, { recursive: true })
      }
    } catch (e) {
      console.error(`Deleting temporary test folder failed. Path ${tempTestPath}`);
    }
  })

  return { test };
}
