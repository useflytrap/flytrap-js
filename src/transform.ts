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
import { extractArtifacts } from './transform/artifacts/artifacts'
import { tryCatch, tryCatchSync } from './core/util'
import { readFileSync } from 'node:fs'
import { excludeDirectoriesIncludeFilePath } from './transform/excludes'
import { containsScriptTags, parseScriptTags } from './transform/parseScriptTags'
import { batchedArtifactsUpload } from './transform/artifacts/batchedArtifactsUpload'
import { getFileExtension } from './transform/util'
import {
	getArtifactsToUpload,
	markArtifactAsUploaded,
	upsertArtifact,
	upsertArtifacts
} from './transform/artifacts/cache'
import { Artifact } from './exports'

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

		// Exclude directories
		if (config && config.excludeDirectories) {
			if (excludeDirectoriesIncludeFilePath(id, config.excludeDirectories)) {
				return
			}
		}

		// Additional logic for Vue & SvelteKit
		if (containsScriptTags(code)) {
			const scriptTags = parseScriptTags(code)
			if (scriptTags.length > 1) {
				log.warn(
					'transform',
					`Found multiple "script" blocks in source file "${id}", only the first one will get transformed.`
				)
			}
		} else {
			/**
			 * If we're transforming a .svelte or .vue file without script tags, don't
			 */
			if (['.svelte', '.vue'].includes(getFileExtension(id))) return
		}

		log.info('transform', `Transforming file ${id}`)

		const scriptTags = parseScriptTags(code)
		const scriptContent = scriptTags[0]?.content
		const scriptStartIndex = scriptTags[0]?.start
		const scriptEndIndex = scriptTags[0]?.end

		const wholeSourceFile = new MagicString(code)
		const ss =
			scriptContent && ['.svelte', '.vue'].includes(getFileExtension(id))
				? new MagicString(scriptContent)
				: new MagicString(code)

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
			// Accomodating for script tags
			if (
				scriptStartIndex &&
				scriptEndIndex &&
				['.svelte', '.vue'].includes(getFileExtension(id))
			) {
				const transformedScriptTagContents = flytrapTransformArtifacts(
					ss.toString(),
					id.replace(pkgDirPath, ''),
					config?.packageIgnores
				)
				wholeSourceFile.overwrite(
					scriptStartIndex,
					scriptEndIndex,
					transformedScriptTagContents.code
				)

				transformedFiles.push(id)
				return {
					code: wholeSourceFile.toString(),
					map: wholeSourceFile.generateMap()
				}
			}

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
		if (!config) {
			const log = createHumanLog({
				event: 'transform_failed',
				explanation: 'config_not_found',
				solution: 'define_flytrap_config'
			})
			throw log.toString()
		}

		if (!config.projectId || !config.secretApiKey) {
			const log = createHumanLog({
				event: 'transform_failed',
				explanation: 'invalid_config',
				solution: 'configuration_fix'
			})
			throw log.toString()
		}
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
				const { data: code, error } = tryCatchSync(() =>
					readFileSync(transformedFiles[i]).toString()
				)
				if (error || !code) {
					log.error(
						'transform',
						`An error occurred while reading file at path "${transformedFiles[i]}". Error:`,
						error
					)
					continue
				}
				try {
					// Script tags support
					const scriptTags = parseScriptTags(code)
					const scriptStartIndex = scriptTags[0]?.start
					const scriptEndIndex = scriptTags[0]?.end

					if (scriptStartIndex && scriptEndIndex) {
						artifacts.push(
							...extractArtifacts(
								code.substring(scriptStartIndex, scriptEndIndex),
								transformedFiles[i].replace(pkgDirPath, '')
							)
						)
					} else {
						artifacts.push(...extractArtifacts(code, transformedFiles[i].replace(pkgDirPath, '')))
					}
				} catch (e) {
					console.warn(`Extracting artifacts failed for file ${transformedFiles[i]}`)
				}
			}

			// Upload artifacts
			const { data: uploadedBatches, error } = await tryCatch(
				upsertArtifacts(config.projectId, config.secretApiKey, artifacts)
			)
			if (error || !uploadedBatches) {
				console.error(
					`Oops! Something went wrong while pushing artifacts to the Flytrap API. Error:`
				)
				console.error(error)
				return
			}
		}
	}
}

export const FlytrapTransformPlugin = createUnplugin(() => unpluginOptions)
