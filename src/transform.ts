import { pathToFileURL } from 'node:url'
import { UnpluginOptions, createUnplugin } from 'unplugin'
import { parseURL, parseQuery } from 'ufo'
import MagicString from 'magic-string'
import { addFlytrapInit, addMissingFlytrapImports } from './transform/imports'
import { flytrapTransformUff } from './transform/index'
import { packageDirectorySync } from 'pkg-dir'
import { loadConfig } from './transform/config'
import { setFlytrapConfig } from './core/config'
import { log } from './core/logging'
import { empty, normalizeFilepath, tryCatchSync } from './core/util'
import { readFileSync } from 'node:fs'
import { excludeDirectoriesIncludeFilePath } from './transform/excludes'
import { containsScriptTags, parseScriptTags } from './transform/parseScriptTags'
import { calculateSHA256Checksum, getFileExtension } from './transform/util'
import { upsertArtifacts } from './transform/artifacts/cache'
import { Artifact, FlytrapConfig, encrypt } from './exports'
import { createHumanLog } from './core/errors'

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
	async transform(code, id, config?: FlytrapConfig) {
		if (
			code.includes('@flytrap-ignore') ||
			id.includes('/node_modules/') ||
			id.includes('flytrap-libs/dist') ||
			id.includes('flytrap-libs/browser')
		) {
			return
		}

		if (code.includes(`arguments.callee`)) {
			const argumentsCalleeError = createHumanLog({
				events: ['transform_file_failed'],
				explanations: ['invalid_arguments_callee_use'],
				params: {
					fileNamePath: id
				}
			})

			log.warn('transform', argumentsCalleeError.toString())
			console.warn(argumentsCalleeError.toString())
			return
		}

		// Logging config
		if (!config) {
			const loadedConfig = await loadConfig()
			config = loadedConfig
		}
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
		addMissingFlytrapImports(ss, id, config)

		// add Flytrap init
		if (process.env.NODE_ENV !== 'test') {
			await addFlytrapInit(ss, id, config)
		}

		// Find package root
		const pkgDirPath = packageDirectorySync()
		if (!pkgDirPath) {
			throw createHumanLog({
				events: ['transform_failed'],
				explanations: ['transform_pkg_not_found']
			}).toString()
		}

		try {
			// Accomodating for script tags
			if (
				scriptStartIndex &&
				scriptEndIndex &&
				['.svelte', '.vue'].includes(getFileExtension(id))
			) {
				const transformedScriptTagContents = flytrapTransformUff(
					ss.toString(),
					normalizeFilepath(pkgDirPath, id),
					config
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
			return flytrapTransformUff(ss.toString(), normalizeFilepath(pkgDirPath, id), config)
		} catch (e) {
			if (process.env.NODE_ENV === 'test') {
				throw e
			}
			console.warn(`Oops! Something went wrong while transforming file ${id}. Error:`)
			console.warn(e)
		}
	},
	async buildEnd() {
		const config = await loadConfig()
		if (!config) {
			const log = createHumanLog({
				events: ['transform_failed'],
				explanations: ['config_not_found'],
				solutions: ['define_flytrap_config']
			})
			throw log.toString()
		}

		if (!config.projectId || !config.secretApiKey || empty(config.projectId, config.secretApiKey)) {
			const log = createHumanLog({
				events: ['transform_failed'],
				explanations: ['invalid_config'],
				solutions: ['configuration_fix']
			})
			throw log.toString()
		}

		// Find package root
		const pkgDirPath = packageDirectorySync()
		if (!pkgDirPath) {
			throw createHumanLog({
				events: ['transform_failed'],
				explanations: ['transform_pkg_not_found']
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
				log.error(
					'error',
					`Oops! Something went wrong while pushing artifacts to the Flytrap API. Error:`
				)
				log.error('error', artifactsUpsertError)
				return
			}
		}
	}
}

export const FlytrapTransformPlugin = createUnplugin(() => unpluginOptions)
