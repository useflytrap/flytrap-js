import { join } from 'path'
import { walk } from './file-walker'
import { Target, cleanupTargets, generateFixtures, targetPath } from './helper'
import { it, beforeAll, describe, afterAll } from 'vitest'
import { unpluginOptions } from '../../src/transform'
import { readFileSync } from 'fs'

const targets: Record<string, Target> = {
	zod: {
		repo: 'colinhacks/zod',
		sourcePaths: ['src']
	},
	trpc: {
		repo: 'trpc/trpc',
		sourcePaths: ['packages']
	},
	['supabase-js']: {
		repo: 'supabase/supabase-js',
		sourcePaths: ['src']
	},
	tailwindcss: {
		repo: 'tailwindlabs/tailwindcss',
		sourcePaths: ['src']
	}
	/* svelte: {
		repo: 'sveltejs/svelte',
		sourcePaths: ['src']
	},
	vue: {
		repo: 'vuejs/core',
		sourcePaths: ['packages']
	} */
}

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
				for (let i = 0; i < targets[targetName].sourcePaths.length; i++) {
					for await (const filePath of walk(
						join(targetPath, targetName, targets[targetName].sourcePaths[i])
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
				}
			},
			{ timeout: 10_000 }
		)
	})
}
