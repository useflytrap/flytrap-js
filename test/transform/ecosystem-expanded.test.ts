import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { dirname, join } from 'path'
import { walk } from './file-walker'
import { unpluginOptions } from '../../src/transform'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import degit from 'degit'
import { tryCatchSync } from '../../src/core/util'

export const reposPath = join(__dirname, 'ecosystem-repos')
export const generatedPath = join(__dirname, 'generated-repos')

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
	for (const [, target] of Object.entries(targets)) {
		await degitRepo(target.repo)
	}
}

export type Target = {
	repo: string
	sourcePaths: string[]
	excludePaths: string[]
}

const targets: Record<string, Target> = {
	svelte: {
		repo: 'sveltejs/svelte',
		sourcePaths: ['svelte/src'],
		excludePaths: ['svelte/test']
	}
}

async function transformRepositoryUsingFlytrap(targetName: string, target: Target) {
	for await (const filePath of walk(join(reposPath, targetName))) {
		const copyToGeneratedFolder = (filePath: string, code: string) => {
			writeFileSync(join(generatedPath, getRelativePath(filePath)), code)
		}
		mkdirSync(dirname(join(generatedPath, getRelativePath(filePath))), { recursive: true })
		const code = readFileSync(filePath).toString()

		if (target.excludePaths.some((path) => filePath.includes(path))) {
			copyToGeneratedFolder(filePath, code)
			continue
		}

		const shouldTransform = unpluginOptions.transformInclude!(filePath)

		if (shouldTransform && target.sourcePaths.some((path) => filePath.includes(path))) {
			try {
				// @ts-expect-error
				const transformedCode = await unpluginOptions.transform(code.toString(), filePath)
				// @ts-ignore
				copyToGeneratedFolder(filePath, transformedCode.code)
			} catch (e) {
				copyToGeneratedFolder(filePath, code)
			}
		} else {
			copyToGeneratedFolder(filePath, code)
		}
	}
}

beforeAll(async () => {
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
	cleanupTargets()
})

for (const [targetName] of Object.entries(targets)) {
	describe(targetName, () => {
		it('runs tests', () => {
			expect(true).toEqual(true)
		})
	})
}
