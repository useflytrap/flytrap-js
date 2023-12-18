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
import { Artifact, FlytrapConfig } from './core/types'
import { createHumanLog } from './core/errors'
import { encrypt } from './core/encryption'
import { randomUUID } from 'node:crypto'
import { batchedArtifactsUploadByBuildId } from './transform/artifacts/batchedArtifactsUpload'

const transformedFiles = new Set<string>([])

let globalBuildId: string | undefined = undefined

const setBuildId = (buildId: string) => {
	if (globalBuildId !== undefined) return
	log.info('transform', `Setting build ID to "${buildId}"`)
	globalBuildId = buildId
}

export const unpluginOptions: UnpluginOptions = {
	name: 'FlytrapTransformPlugin',
	enforce: 'pre',
	async buildStart() {
		const config = await loadConfig()

		// Generate build ID
		const buildId =
			config?.generateBuildId !== undefined ? await config.generateBuildId() : randomUUID()

		setBuildId(buildId)
	},
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

		// Loading config
		if (!config) {
			const loadedConfig = await loadConfig()
			config = loadedConfig
		}
		if (config) setFlytrapConfig(config)

		// Check that build ID is set
		if (globalBuildId === undefined) {
			log.error(
				'error',
				`Transform failed because build ID is undefined. Expected string. Are you returning undefined from your 'generateBuildId' function?`
			)
			return
		}

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
		await addFlytrapInit(ss, id, config, globalBuildId)

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

						if (encryptedSource.err) {
							const humanLog = encryptedSource.val
							// @ts-expect-error
							humanLog.addEvents(['sending_artifacts_failed'])
							log.error('error', humanLog.toString())
							return
						}

						artifacts.push({
							checksum,
							encryptedSource: encryptedSource.val,
							filePath: normalizeFilepath(pkgDirPath, transformedFilePath),
							buildId: globalBuildId
						})
					} else {
						const checksum = calculateSHA256Checksum(code)
						const encryptedSource = await encrypt(config.publicApiKey, code)

						if (encryptedSource.err) {
							const humanLog = encryptedSource.val
							// @ts-expect-error
							humanLog.addEvents(['sending_artifacts_failed'])
							log.error('error', humanLog.toString())
							return
						}

						artifacts.push({
							checksum,
							encryptedSource: encryptedSource.val,
							filePath: normalizeFilepath(pkgDirPath, transformedFilePath),
							buildId: globalBuildId
						})
					}
				} catch (e) {
					console.error(e)
					console.warn(`Extracting artifacts failed for file ${transformedFilePath}`)
				}
			}

			if (globalBuildId === undefined) {
				const humanLog = createHumanLog({
					events: ['sending_artifacts_failed'],
					explanations: ['build_id_undefined'],
					solutions: ['join_discord']
				})
				log.error('error', humanLog.toString())
				return
			}

			// Upload new artifacts
			const upsertArtifactsResult = await batchedArtifactsUploadByBuildId(
				artifacts,
				config.secretApiKey,
				config.projectId,
				globalBuildId
			)

			if (upsertArtifactsResult.err) {
				// Show error
				const humanLog = upsertArtifactsResult.val
				humanLog.addEvents(['sending_artifacts_failed'])
				humanLog.addSolutions(['join_discord'])
				log.error('error', humanLog.toString())
			} else {
				log.info(
					'storage',
					`Pushed ${upsertArtifactsResult.val.at(0)?.length} artifacts to the Flytrap API.`
				)
			}
		}
	}
}

export const FlytrapTransformPlugin = createUnplugin(() => unpluginOptions)
