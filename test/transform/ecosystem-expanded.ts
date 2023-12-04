import { afterAll, beforeAll, describe, expect, it, should, vitest } from 'vitest'
import { dirname, join, relative, resolve } from 'path'
import { walk } from './file-walker'
import { unpluginOptions } from '../../src/transform'
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'
import degit from 'degit'
import { tryCatchSync } from '../../src/core/util'
import { homedir } from 'os'
import { FlytrapConfig } from '../../src/core/types'
import { execaCommand, execaCommandSync } from 'execa'

const FLYTRAP_SOURCE_ROOT = join(__dirname, '..', '..')
export const reposPath = join(homedir(), 'flytrap-test', 'ecosystem-repos')
export const generatedPath = join(homedir(), 'flytrap-test', 'generated-repos')

const getClonedRepoPath = (target: Target) => join(reposPath, target.repo.split('/').at(-1)!)
const getGeneratedRepoPath = (target: Target) => join(generatedPath, target.repo.split('/').at(-1)!)

export const getRelativePath = (absolutePath: string) => absolutePath.replace(reposPath, '')

function cloneRepository(repoName: string, remoteUrl: string, commitHash?: string) {
	const clonedRepoPath = join(reposPath, repoName)
	execaCommandSync(`git clone --depth 1 ${remoteUrl} ${clonedRepoPath}`)
	// @todo: support for commit hashes
	/* execaCommandSync(`git fetch --depth 1 origin ${commitHash}`, {
		cwd: clonedRepoPath,
	})
	execaCommandSync(`git checkout ${commitHash}`, {
		cwd: clonedRepoPath,
	})*/
}

async function degitRepo(repoName: string) {
	const [, name] = repoName.split('/')
	const emitter = degit(repoName, { force: true })
	await emitter.clone(join(reposPath, name))
}

export function cleanupTargets() {
	rmSync(reposPath, { recursive: true })
	rmSync(generatedPath, { recursive: true })
}

export async function generateFixtures(targets: Record<string, Target>) {
	for (const [targetName, target] of Object.entries(targets)) {
		// mkdirSync(join(reposPath, targetName), { recursive: true })
		mkdirSync(join(generatedPath, targetName), { recursive: true })
		cloneRepository(targetName, target.repo)
	}
}

export type Target = {
	repo: string
	sourcePaths: string[]
	excludePaths: string[]
	commands: {
		command: string
		expectedOutputs?: string[]
		reject?: false
	}[]
	config: FlytrapConfig
	// only run the targets with `only` === true
	only?: true
}

const targets: Record<string, Target> = {
	/* zod: {
		repo: 'colinhacks/zod',
		sourcePaths: ['src'],
		excludePaths: ['src/__tests__', 'src/benchmarks'],
		commands: [
			{ command: `yarn install` },
			{ command: `yarn add ${FLYTRAP_SOURCE_ROOT}` },
			{ command: `yarn build` },
			{
				command: `yarn test`,
			},
		],
		config: {
			publicApiKey: 'pk_...',
			projectId: 'test-project',
			transformOptions: {}
		}
	}, */

	// lodash
	/**
	 * 1352 pass
	 * 1 skip
	 * 192 fail
	 */
	/* lodash: {
		repo: 'lodash/lodash#main',
		sourcePaths: ['src'],
		excludePaths: ['test'],
		runCommands: [
			'bun install',
			`bun install ${FLYTRAP_SOURCE_ROOT}`,
			// 'bun build',
			'bun test'
		],
		config: {
			publicApiKey: 'pk_...',
			projectId: 'test-project',
			transformOptions: {},
			logging: []
		}
	}, */
	svelte: {
		// repo: 'sveltejs/svelte',
		repo: 'git@github.com:sveltejs/svelte.git',
		sourcePaths: ['packages/svelte/src'],
		excludePaths: ['packages/svelte/tests'],
		commands: [
			{ command: 'pnpm install' },
			{ command: `pnpm install ${FLYTRAP_SOURCE_ROOT} -w` },
			{
				command: 'pnpm test',
				//  Tests  2 failed | 3950 passed | 65 skipped
				expectedOutputs: ['2 failed', '3950 passed']
			}
		],
		config: {
			publicApiKey: 'pk_...',
			projectId: 'test-project',
			transformOptions: {},
			// disable logging
			logging: []
		}
	},
	prettier: {
		// only: true,
		// repo: 'prettier/prettier#56408635eb01002940513e89fa5e8d9c98c9a5af',
		repo: 'git@github.com:prettier/prettier.git',
		sourcePaths: ['src'],
		excludePaths: ['tests'],

		commands: [
			{ command: `npm install --force` },
			{ command: `npm install ${FLYTRAP_SOURCE_ROOT} --force` },
			{ command: `npm run build` },
			{
				command: 'npm test',
				expectedOutputs: ['21166 passed']
			}
		],

		// runCommands: ['npm install', `npm install ${FLYTRAP_SOURCE_ROOT}`, 'npm test'],
		config: {
			publicApiKey: 'pk_...',
			projectId: 'test-project',
			transformOptions: {},
			// disable logging
			logging: []
		}
	},
	vue: {
		only: true,
		// repo: 'vuejs/core',
		repo: 'git@github.com:vuejs/core.git',
		sourcePaths: ['packages'],
		excludePaths: [
			...[
				'compiler-core',
				'compiler-dom',
				'compiler-sfc',
				'compiler-ssr',
				'reactivity-transform',
				'reactivity',
				'runtime-core',
				'runtime-dom',
				'server-renderer',
				'shared',
				'vue-compat',
				'vue'
			].map((p) => `packages/${p}/__tests__`),
			'packages/dts-built-test',
			'packages/dts-test',
			'packages/runtime-test'
		],
		commands: [
			{ command: `pnpm install` },
			{ command: `pnpm install -w ${FLYTRAP_SOURCE_ROOT}` },
			{ command: `pnpm build` },
			{
				command: `pnpm test-unit`,
				expectedOutputs: ['2815 passed']
			}
		],
		config: {
			publicApiKey: 'pk_...',
			projectId: 'test-project',
			transformOptions: {},
			// disable logging
			logging: []
		}
	}
	// @todo:
	// vue
	// react
	// chalk
	// express
	// webpack
	// rollup
	// vite
	// esbuild
	// core-js
	// redux
	// mocha
	// redis
	// mysql
}

async function transformRepositoryUsingFlytrap(targetName: string, target: Target) {
	for await (const filePath of walk(join(reposPath, targetName))) {
		const copyToGeneratedFolder = (filePath: string, code: string) => {
			writeFileSync(join(generatedPath, getRelativePath(filePath)), code)
		}
		mkdirSync(dirname(join(generatedPath, getRelativePath(filePath))), { recursive: true })
		const code = readFileSync(filePath).toString()

		if (
			target.excludePaths.some((path) =>
				filePath.replace(join(reposPath, targetName), '').includes(path)
			)
		) {
			copyToGeneratedFolder(filePath, code)
			continue
		}

		const shouldTransform = unpluginOptions.transformInclude!(filePath)

		if (shouldTransform && target.sourcePaths.some((path) => filePath.includes(path))) {
			// @ts-expect-error
			const transformedCode = await unpluginOptions.transform(
				code.toString(),
				filePath,
				// @ts-expect-error: we extended types with `config`
				target.config
			)

			if (transformedCode) {
				copyToGeneratedFolder(filePath, (transformedCode as any).code)
			} else {
				copyToGeneratedFolder(filePath, code)
			}
		} else {
			copyToGeneratedFolder(filePath, code)
		}
	}
}

beforeAll(async () => {
	tryCatchSync(() => rmSync(reposPath, { recursive: true, force: true }))
	tryCatchSync(() => rmSync(generatedPath, { recursive: true, force: true }))

	await generateFixtures(targets)

	tryCatchSync(() => mkdirSync(generatedPath))

	// Walk directory
	await Promise.all(
		Object.entries(targets).map(async ([target, value]) => {
			await transformRepositoryUsingFlytrap(target, value)
		})
	)
}, 120_000)

afterAll(() => {
	// cleanupTargets()
})

const onlyTarget = Object.entries(targets).find(([, target]) => target.only)
const filteredTargets = onlyTarget ? [onlyTarget] : Object.entries(targets)

for (const [targetName, targetDefinition] of filteredTargets) {
	describe(`target -> ${targetName}`, () => {
		// Running commands and their assertions
		for (let i = 0; i < targetDefinition.commands.length; i++) {
			const commandToRun = targetDefinition.commands[i].command
			const expectedOutputs = targetDefinition.commands[i].expectedOutputs
			it(
				`runs command "${commandToRun}"`,
				async () => {
					const { stdout, stderr } = await execaCommand(commandToRun, {
						cwd: join(generatedPath, targetName),
						reject: targetDefinition.commands[i].reject ?? true
					})

					const combinedOut = stderr + stdout

					// Make assertions
					if (expectedOutputs) {
						for (let j = 0; j < expectedOutputs.length; j++) {
							try {
								expect(combinedOut.includes(expectedOutputs[j])).toBe(true)
							} catch (e) {
								console.error(`Expected output "${expectedOutputs[j]}" was missing in stdout.`)
								throw e
							}
						}
					}
				},
				{ timeout: 60_000 * 5 }
			)
		}
	})
}

it('runs tests', () => {
	expect(true).toEqual(true)
})

for (const [targetName] of Object.entries(targets)) {
	describe(targetName, () => {
		it('runs tests', () => {
			expect(true).toEqual(true)
		})
	})
}
