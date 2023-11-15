import { afterAll, beforeAll, describe, expect, it, should, vitest } from 'vitest'
import { dirname, join, relative, resolve } from 'path'
import { walk } from './file-walker'
import { unpluginOptions } from '../../src/transform'
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'
import degit from 'degit'
import { tryCatchSync } from '../../src/core/util'
import { homedir } from 'os'
import { FlytrapConfig } from '../../src/core/types'
import { execaCommand } from 'execa'

const FLYTRAP_SOURCE_ROOT = join(__dirname, '..', '..')
export const reposPath = join(homedir(), 'flytrap-test', 'ecosystem-repos')
export const generatedPath = join(homedir(), 'flytrap-test', 'generated-repos')

const getClonedRepoPath = (target: Target) => join(reposPath, target.repo.split('/').at(-1)!)
const getGeneratedRepoPath = (target: Target) => join(generatedPath, target.repo.split('/').at(-1)!)

export const getRelativePath = (absolutePath: string) => absolutePath.replace(reposPath, '')

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
		await degitRepo(target.repo)
		renameSync(getClonedRepoPath(target), join(reposPath, targetName))
	}
}

export type Target = {
	repo: string
	sourcePaths: string[]
	excludePaths: string[]
	// commands to run that need to
	// complete with a zero exit code,
	// eg. npm run build, npm test
	runCommands: string[]
	config: FlytrapConfig
}

const targets: Record<string, Target> = {
	/* zod: {
		repo: 'colinhacks/zod',
		sourcePaths: ['src'],
		excludePaths: ['src/__tests__', 'src/benchmarks'],
		runCommands: [
			"yarn install",
			// "yarn install /Users/rasmus/Desktop/DEV/Web/flytrap-libs"
			`yarn add ${FLYTRAP_SOURCE_ROOT}`,
			"yarn build",
			"yarn test"
		],
		config: {
			publicApiKey: 'pk_...',
			projectId: 'test-project',
			transformOptions: {
				disableTransformation: [
					'function-declaration',
					'call-expression'
				]
			}
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
			transformOptions: {
				disableTransformation: [
					// 'function-declaration',
					'call-expression'
				]
			}
		}
	}, */
	svelte: {
		repo: 'sveltejs/svelte',
		sourcePaths: ['packages/svelte/src'],
		excludePaths: ['packages/svelte/tests'],
		runCommands: [
			'pnpm install',
			`pnpm install ${FLYTRAP_SOURCE_ROOT} -w`,
			'pnpm build',
			'pnpm test'
		],
		config: {
			publicApiKey: 'pk_...',
			projectId: 'test-project',
			transformOptions: {
				disableTransformation: ['function-declaration', 'call-expression']
			}
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

	/* prettier: {
		repo: 'prettier/prettier#83b9f62',
		sourcePaths: ['src'],
		excludePaths: ['tests'],
		runCommands: [
			'npm install',
			// @todo: make not hardcoded
			"npm install /Users/rasmus/Desktop/DEV/Web/flytrap-libs",
			'npm test'
		],
		config: {
			publicApiKey: 'pk_...',
			projectId: 'test-project',
			transformOptions: {
				disableTransformation: [
					'function-declaration',
					'call-expression'
				]
			}
		}
	} */
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
				target.config
			)
			// @ts-expect-error
			copyToGeneratedFolder(filePath, transformedCode.code)
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

for (const [targetName, targetDefinition] of Object.entries(targets)) {
	describe(`target -> ${targetName}`, () => {
		// Running commands
		for (let i = 0; i < targetDefinition.runCommands.length; i++) {
			const command = targetDefinition.runCommands.at(i)!
			it(
				`command "${command}"`,
				async () => {
					const { stdout } = await execaCommand(command, {
						cwd: join(generatedPath, targetName)
					})
					console.log('Stdout: ', stdout.substring(0, 500))
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
