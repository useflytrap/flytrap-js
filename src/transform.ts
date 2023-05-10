import { pathToFileURL } from 'node:url'
import { createUnplugin } from 'unplugin'
import { parseURL, parseQuery } from 'ufo'
import MagicString from 'magic-string'
import { addFlytrapInit, addMissingFlytrapImports } from './transform/imports'
import { flytrapTransform } from './transform/index'

import { packageDirectorySync } from 'pkg-dir'
import { createHumanLog } from './core/human-logs'

export const FlytrapTransformPlugin = createUnplugin(() => {
	return {
		name: 'FlytrapTransformPlugin',
		enforce: 'pre',
		transformInclude(id) {
			const { pathname, search } = parseURL(decodeURIComponent(pathToFileURL(id).href))
			const { type } = parseQuery(search)

			// vue files
			if (pathname.endsWith('.vue') && (type === 'script' || !search)) {
				return true
			}

			// svelte files
			if (pathname.endsWith('.svelte') && (type === 'script' || !search)) {
				return true
			}

			// js files
			if (pathname.match(/\.((c|m)?j|t)sx?$/g)) {
				return true
			}

			return false
		},
		async transform(code, id) {
			if (code.includes('@flytrap-ignore') || id.includes('/node_modules/')) {
				return
			}

			const ss = new MagicString(code)
			// add missing Flytrap imports
			addMissingFlytrapImports(ss)

			// add Flytrap init
			await addFlytrapInit(ss)

			// Find package root
			const pkgDirPath = packageDirectorySync()
			if (!pkgDirPath) {
				throw createHumanLog({
					event: 'transform_failed',
					explanation: 'transform_pkg_not_found'
				}).toString()
			}

			try {
				return flytrapTransform(ss.toString(), id.replace(pkgDirPath, ''))
			} catch (e) {
				console.warn('Oops! Something went wrong while transforming your code, error:')
				console.warn(e)
			}
		}
	}
})

// Export code transform
export * from './transform/index'
