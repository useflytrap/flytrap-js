import { join } from 'path'
import { walk } from './file-walker'
import { Target, cleanupTargets, generateFixtures, targetPath } from './helper'
import { it, beforeAll, describe, afterAll } from 'vitest'
import { unpluginOptions } from '../../src/transform'
import { readFileSync } from 'fs'

const targets: Record<string, Target> = {
	zod: {
		repo: 'colinhacks/zod',
		sourcePath: 'src'
	},
	trpc: {
		repo: 'trpc/trpc',
		sourcePath: 'packages'
	},
	['supabase-js']: {
		repo: 'supabase/supabase-js',
		sourcePath: 'src'
	},
	tailwindcss: {
		repo: 'tailwindlabs/tailwindcss',
		sourcePath: 'src'
	}
} as const

beforeAll(async () => {
	await generateFixtures(targets)
}, 30_000)

afterAll(() => {
	cleanupTargets()
})

for (const [targetName] of Object.entries(targets)) {
	describe(targetName, () => {
		it(
			`transforms ${targetName} without error`,
			async () => {
				for await (const filePath of walk(
					join(targetPath, targetName, targets[targetName].sourcePath)
				)) {
					const shouldTransform = unpluginOptions.transformInclude!(filePath)
					if (shouldTransform) {
						const code = readFileSync(filePath)
						try {
							// @ts-expect-error
							await unpluginOptions.transform(code.toString(), filePath)
						} catch (e) {
							console.error(`Failed to transform file ${filePath}`)
							console.error(e)
							throw new Error(`Transforming ${targetName} failed for file ${filePath}`)
						}
					}
				}
			},
			{ timeout: 10_000 }
		)
	})
}
