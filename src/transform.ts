import { pathToFileURL } from 'node:url'
import { UnpluginOptions, createUnplugin } from 'unplugin'
import { parseURL, parseQuery } from 'ufo'
import MagicString from 'magic-string'
import { addFlytrapInit, addMissingFlytrapImports } from './transform/imports'
import { flytrapTransform } from './transform/index'

import { packageDirectorySync } from 'pkg-dir'
import { createHumanLog } from './core/human-logs'
import { loadConfig } from './transform/config'
import { setFlytrapConfig } from './core/config'
import { log } from './core/logging'

export const unpluginOptions: UnpluginOptions = {
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

		// Logging config
		const config = await loadConfig()
		if (config) setFlytrapConfig(config)
		log.info('transform', `Transforming file ${id}`)

		const ss = new MagicString(code)
		// add missing Flytrap imports
		addMissingFlytrapImports(ss)

		// add Flytrap init
		if (process.env.NODE_ENV !== 'test') {
			await addFlytrapInit(ss)
		}

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
			console.log('TRANSFORMED FILE CODE: ')
			console.log(ss.toString())
			console.log(
				' errorr  -- errorr  -- errorr  -- errorr  -- errorr  -- errorr  -- errorr  --  errorr  -- errorr  -- errorr  -- errorr  -- errorr  -- errorr  -- errorr  --  errorr  -- errorr  -- errorr  -- errorr  -- errorr  -- errorr  -- errorr  --  errorr  -- errorr  -- errorr  -- errorr  -- errorr  -- errorr  -- errorr  --  errorr  -- errorr  -- errorr  -- errorr  -- errorr  -- errorr  -- errorr  --  errorr  -- errorr  -- errorr  -- errorr  -- errorr  -- errorr  -- errorr  -- '
			)
			console.log('filepath ', id)
			console.log(JSON.stringify(e))
			console.log(e)
			console.log('FILE ', id)
			if (process.env.NODE_ENV === 'test') {
				throw e
			}
			console.warn(`Oops! Something went wrong while transforming file ${id}. Error:`)
			console.warn(e)
		}
	}
}

export const FlytrapTransformPlugin = createUnplugin(() => unpluginOptions)
