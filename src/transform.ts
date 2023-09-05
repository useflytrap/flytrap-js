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
import { normalizeFilepath, tryCatchSync } from './core/util'
import { readFileSync } from 'node:fs'
import { excludeDirectoriesIncludeFilePath } from './transform/excludes'
import { containsScriptTags, parseScriptTags } from './transform/parseScriptTags'
import { calculateSHA256Checksum, getFileExtension } from './transform/util'
import { upsertArtifacts } from './transform/artifacts/cache'
import { Artifact, encrypt } from './exports'

const transformedFiles = new Set<string>([])

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
		addMissingFlytrapImports(ss, config?.browser)

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
					normalizeFilepath(pkgDirPath, id),
					config?.packageIgnores
				)
				wholeSourceFile.overwrite(
					scriptStartIndex,
					scriptEndIndex,
					transformedScriptTagContents.code
				)

				transformedFiles.add(id)
				return {
					code: wholeSourceFile.toString(),
					map: wholeSourceFile.generateMap()
				}
			}

			transformedFiles.add(id)
			return flytrapTransformArtifacts(
				ss.toString(),
				normalizeFilepath(pkgDirPath, id),
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

		if (config.disableArtifacts !== true && process?.env?.NODE_ENV === 'production') {
			// Push artifacts
			log.info(
				'storage',
				`Generating artifacts for ${transformedFiles.size} transformed source files.`
			)
			const artifacts: Artifact[] = []

			for (const transformedFilePath of transformedFiles) {
				const { data: code, error } = tryCatchSync(() =>
					readFileSync(transformedFilePath).toString()
				)

				if (error || !code) {
					log.error(
						'transform',
						`An error occurred while reading file at path "${transformedFilePath}". Error:`,
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
						const checksum = calculateSHA256Checksum(
							code.substring(scriptStartIndex, scriptEndIndex)
						)
						const encryptedSource = await encrypt(
							config.publicApiKey,
							code.substring(scriptStartIndex, scriptEndIndex)
						)
						artifacts.push({
							checksum,
							encryptedSource,
							filePath: normalizeFilepath(pkgDirPath, transformedFilePath)
						})
					} else {
						const checksum = calculateSHA256Checksum(code)
						const encryptedSource = await encrypt(config.publicApiKey, code)
						artifacts.push({
							checksum,
							encryptedSource,
							filePath: normalizeFilepath(pkgDirPath, transformedFilePath)
						})
					}
				} catch (e) {
					console.warn(`Extracting artifacts failed for file ${transformedFilePath}`)
				}
			}

			// Upload new artifacts
			const { error: artifactsUpsertError } = await upsertArtifacts(
				config.projectId,
				config.secretApiKey,
				artifacts
			)

			if (artifactsUpsertError !== null) {
				console.error(
					`Oops! Something went wrong while pushing artifacts to the Flytrap API. Error:`
				)
				console.error(artifactsUpsertError)
				return
			}
		}
	}
}

export const FlytrapTransformPlugin = createUnplugin(() => unpluginOptions)
