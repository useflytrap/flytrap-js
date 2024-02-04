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
  id?: string;
  debug?: boolean;
} & Pick<PackageJson.PackageJsonStandard, 'dependencies'>;

export function createNextTest({
  path,
  timeout = ms("1 minute"),
  port = 3000,
  dependencies,
  showStdout = false,
  serverReadyString = 'ready',
  debug,
  id
}: NextTestOptions) {
  let serverProcess: ExecaChildProcess<string> | undefined;
  let tempTestPath: string | undefined;

  const test = baseTest.extend<{}, { workerStorageState: string }>({
    // @todo: auth here…
    baseURL: `http://localhost:${port}`,
  })

  test.setTimeout(timeout)

  const idOr = (id?: string) => id === undefined ? '' : `${id}: `;

  // Start Next.js dev server
  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(timeout)
    tempTestPath = await createTempTestFolder(path)

    if (debug) {
      console.log(`${idOr(id)} Created temp folder`)
    }

    // Patch dependencies
    mergePackageJson(tempTestPath, { dependencies });

    // Run install
    await pnpmInstall(tempTestPath, showStdout)
    if (debug) {
      console.log(`${idOr(id)} Finished "pnpm install"`)
    }

    // Start dev server
    serverProcess = execa("pnpm", ["dev"], {
      cwd: tempTestPath,
      env: {
        ...process.env,
        PORT: port.toString()
      }
    })

    if (debug) {
      console.log(`${idOr(id)} Started server`)
    }

    if (true) {
      serverProcess.stdout?.on('data', (data: Buffer | string) => console.log(idOr(id), data.toString()))
      serverProcess.stderr?.on('data', (data: Buffer | string) => console.error(idOr(id), data.toString()))
    }
    
    await new Promise<undefined>(resolve => {
      serverProcess?.stdout?.on('data', (data: string | Buffer) => {
        if (data.toString().toLowerCase().includes(serverReadyString)) {
          resolve(undefined);
        }
      });
    });

    if (debug) {
      console.log(`${idOr(id)} Server ready`)
    }
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
