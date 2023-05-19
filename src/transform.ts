import { pathToFileURL } from 'node:url'
import { UnpluginOptions, createUnplugin } from 'unplugin'
import { parseURL, parseQuery } from 'ufo'
import MagicString from 'magic-string'
import { addFlytrapInit, addMissingFlytrapImports } from './transform/imports'
import { flytrapTransformArtifacts } from './transform/index'
import { packageDirectorySync } from 'pkg-dir'
import { createHumanLog } from './core/human-logs'
import { loadConfig } from './transform/config'
import { setFlytrapConfig } from './core/config'
import { log } from './core/logging'
import { Artifact, extractArtifacts } from './transform/artifacts'
import { post } from './core/util'
import { readFileSync } from 'node:fs'

const transformedFiles: string[] = []

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

		if (pathname.endsWith('.d.ts')) {
			return false
		}

		// js files
		if (pathname.match(/\.((c|m)?j|t)sx?$/g)) {
			return true
		}

		return false
	},
	async transform(code, id) {
		if (
			code.includes('@flytrap-ignore') ||
			id.includes('/node_modules/') ||
			id.includes('flytrap-libs/dist')
		) {
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
			await addFlytrapInit(ss, config)
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
			transformedFiles.push(id)
			return flytrapTransformArtifacts(
				ss.toString(),
				id.replace(pkgDirPath, ''),
				config?.packageIgnores
			)
		} catch (e) {
			if (process.env.NODE_ENV === 'test') {
				throw e
			}
			if (!String(e).includes("reading 'buildError'")) {
				console.warn(`Oops! Something went wrong while transforming file ${id}. Error:`)
				console.warn(e)
			}
		}
	},
	async buildEnd() {
		const config = await loadConfig()
		if (!config) return
		// Find package root
		const pkgDirPath = packageDirectorySync()
		if (!pkgDirPath) {
			throw createHumanLog({
				event: 'transform_failed',
				explanation: 'transform_pkg_not_found'
			}).toString()
		}

		if (!config.disableArtifacts && process?.env?.NODE_ENV === 'production') {
			// Push artifacts
			log.info(
				'storage',
				`Generating artifacts for ${transformedFiles.length} transformed source files.`
			)
			const artifacts: Artifact[] = []
			for (let i = 0; i < transformedFiles.length; i++) {
				const code = readFileSync(transformedFiles[i]).toString()
				try {
					artifacts.push(...extractArtifacts(code, transformedFiles[i].replace(pkgDirPath, '')))
				} catch (e) {
					console.warn(`Extracting artifacts failed for file ${transformedFiles[i]}`)
				}
			}

			log.info(
				'storage',
				`Created ${artifacts.length} artifacts. Size: ${JSON.stringify(artifacts).length}`
			)
			log.info(
				'api-calls',
				`Pushing ${artifacts.length} artifacts to the Flytrap API. Payload size: ${
					JSON.stringify(artifacts).length
				}`
			)

			const { data, error } = await post(
				`http://localhost:3000/api/v1/artifacts/${config?.projectId}`,
				JSON.stringify({
					artifacts
				}),
				{
					headers: new Headers({
						Authorization: `Bearer ${config?.secretApiKey}`,
						'Content-Type': 'application/json'
					})
				}
			)
			if (error) {
				console.error(
					`Oops! Something went wrong while pushing artifacts to the Flytrap API. Error:`
				)
				console.error(error)
			}
			if (data) {
				log.info(
					'api-calls',
					`Successfully pushed ${artifacts.length} artifacts to the Flytrap API.`
				)
			}
		}
	}
}

export const FlytrapTransformPlugin = createUnplugin(() => unpluginOptions)
