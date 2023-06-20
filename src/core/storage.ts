import type {
	CaptureDecryptedAndRevived,
	CapturePayload,
	CapturedCall,
	CapturedFunction,
	DatabaseCapture,
	Storage
} from './types'
import { FLYTRAP_API_BASE, getLoadedConfig } from './config'
import { getUserId } from '../index'
import { empty, formatBytes, get, post, tryCatchSync } from './util'
import { createHumanLog } from './human-logs'
import SuperJSON from 'superjson'
import { FLYTRAP_UNSERIALIZABLE_VALUE, NO_SOURCE } from './constants'
import { encrypt } from './encryption'
import { log } from './logging'
import { serializeError } from 'serialize-error'
import { copy } from 'copy-anything'
import {
	addLinksToCaptures,
	decryptCapture,
	extractArgs,
	extractOutputs,
	parse,
	removeCircularDependencies,
	stringify,
	superJsonRegisterCustom
} from './stringify'

const loadedCaptures = new Map<string, CaptureDecryptedAndRevived | undefined>()

export const browserStorage: Storage = {
	getItem(captureId) {
		const captureStringified = localStorage.getItem(captureId)
		if (!captureStringified) return null
		return parse<CaptureDecryptedAndRevived>(captureStringified)
	},
	removeItem(captureId) {
		return localStorage.removeItem(captureId)
	},
	setItem(captureId, capture) {
		return localStorage.setItem(captureId, stringify(capture))
	}
}

const isBrowser = new Function('try {return this===window;}catch(e){return false;}')

export const fileStorage: Storage = {
	getItem(captureId) {
		const { readFileSync } = require('fs')
		const { join } = require('path')
		const { homedir } = require('os')
		const getCacheDir = () => join(homedir(), '.flytrap-cache')
		try {
			const captureStringified = readFileSync(join(getCacheDir(), `${captureId}.json`), 'utf-8')
			if (!captureStringified) return null
			return parse<CaptureDecryptedAndRevived>(captureStringified)
		} catch (e) {
			return null
		}
	},
	removeItem(captureId) {
		const { rmSync } = require('fs')
		const { join } = require('path')
		const { homedir } = require('os')
		const getCacheDir = () => join(homedir(), '.flytrap-cache')
		return rmSync(join(getCacheDir(), `${captureId}.json`))
	},
	setItem(captureId, capture) {
		const { writeFileSync, mkdirSync } = require('fs')
		const { join } = require('path')
		const { homedir } = require('os')
		const getCacheDir = () => join(homedir(), '.flytrap-cache')
		mkdirSync(getCacheDir(), { recursive: true })
		return writeFileSync(join(getCacheDir(), `${captureId}.json`), stringify(capture))
	}
}

function getStorage(): Storage {
	if (isBrowser()) {
		return browserStorage
	}

	return fileStorage
}

export function getLoadedCapture() {
	const { captureId } = getLoadedConfig() ?? {}
	if (!captureId) return null
	return getFlytrapStorage().getCapture(captureId)
}

export async function loadAndPersist(
	captureId: string,
	secretApiKey: string,
	privateKey: string
): Promise<boolean> {
	const capture = await getFlytrapStorage().loadCapture(captureId, secretApiKey, privateKey)
	if (capture) {
		getStorage().setItem(captureId, capture)
		return true
	}
	return false
}

export type FlytrapStorage = {
	getCapture: (captureId: string) => CaptureDecryptedAndRevived | null
	/**
	 * Load the wrapped functions from the API. These are decrypted before
	 * returning them.
	 * @returns
	 */
	loadCapture: (
		captureId: string,
		secretApiKey: string,
		privateKey: string
	) => Promise<CaptureDecryptedAndRevived | undefined>
	saveCapture: (
		functions: CapturedFunction[],
		calls: CapturedCall[],
		error?: Error | string
	) => Promise<void>
}

export const liveFlytrapStorage: FlytrapStorage = {
	getCapture(captureId) {
		return getStorage().getItem(captureId)
	},
	async loadCapture(captureId, secretApiKey, privateKey) {
		if (loadedCaptures.has(captureId)) {
			return loadedCaptures.get(captureId)
		}
		loadedCaptures.set(captureId, undefined) // mark it as being loaded

		const { data, error } = await get<DatabaseCapture>(
			`${FLYTRAP_API_BASE}/api/v1/captures/${captureId}`,
			undefined,
			{
				headers: new Headers({
					Accept: 'application/json',
					Authorization: `Bearer ${secretApiKey}`
				})
			}
		)

		if (error || !data) {
			if (error?.includes('Failed to fetch')) {
				const errorLog = createHumanLog({
					event: 'replay_failed',
					explanation: 'api_unreachable',
					solution: 'try_again_contact_us'
				})
				throw errorLog.toString()
			}

			if (error?.includes('UNAUTHORIZED')) {
				const errorLog = createHumanLog({
					event: 'replay_failed',
					explanation: 'api_unauthorized'
				})
				throw errorLog.toString()
			}

			const errorLog = createHumanLog({
				event: 'replay_failed',
				explanation: 'generic_unexpected_error',
				solution: 'try_again_contact_us'
			})
			throw errorLog.toString()
		}

		const decryptedCapture = await decryptCapture(data, privateKey)

		log.info('storage', `Loaded capture ID "${captureId}".`)

		loadedCaptures.set(captureId, decryptedCapture)
		return decryptedCapture
	},
	async saveCapture(functions, calls, error?) {
		// Here error if
		const { publicApiKey, projectId } = (await getLoadedConfig()) ?? {}

		if (!publicApiKey || !projectId || empty(publicApiKey, projectId)) {
			console.error(
				createHumanLog({
					event: 'capture_failed',
					explanation: 'replay_missing_config_values',
					solution: 'configuration_fix'
				}).toString()
			)
			return
		}

		calls = removeIllegalValues(removeCircularDependencies(calls))
		functions = removeIllegalValues(removeCircularDependencies(functions))

		const args = [...extractArgs(calls), ...extractArgs(functions)]
		const outputs = [...extractOutputs(calls), ...extractOutputs(functions)]

		const linkedCalls = addLinksToCaptures(calls, { args, outputs })
		const linkedFunctions = addLinksToCaptures(functions, { args, outputs })

		const newPayload: CapturePayload = {
			capturedUserId: getUserId(),
			projectId,
			functionName:
				typeof error === 'string'
					? error
					: serializeError(error)?.message ?? serializeError(error)?.name ?? 'unknown',
			source: NO_SOURCE,
			// args, outputs,
			args: await encrypt(publicApiKey, stringify(args)),
			outputs: await encrypt(publicApiKey, stringify(args)),
			calls: linkedCalls,
			functions: linkedFunctions,
			...(error && {
				error: await encrypt(publicApiKey, stringify(serializeError(error)))
			})
		}

		const { data: stringifiedPayload, error: stringifyError } = tryCatchSync(() =>
			stringify(newPayload)
		)

		if (stringifyError || !stringifiedPayload) {
			const errorLog = createHumanLog({
				event: 'capture_failed',
				explanation: 'stringify_capture_failed',
				solution: 'stringify_capture_failed_solution'
			})
			console.error(errorLog.toString())
			console.error(stringifyError)
			return
		}

		const { error: captureError } = await post(
			`${FLYTRAP_API_BASE}/api/v1/captures`,
			stringifiedPayload,
			{
				headers: new Headers({
					Authorization: `Bearer ${publicApiKey}`,
					'Content-Type': 'application/json'
				})
			}
		)

		if (captureError) {
			const errorLog = createHumanLog({
				event: 'capture_failed',
				explanation: 'api_capture_error_response',
				solution: 'try_again_contact_us'
			})
			console.error(errorLog.toString())
			console.error(captureError)
		} else {
			log.info(
				'storage',
				`Saved capture with name "${newPayload.functionName}". Payload Size: ${formatBytes(
					stringifiedPayload.length
				)}`
			)
		}
	}
}

export function getFlytrapStorage(flytrapStorage?: FlytrapStorage) {
	return flytrapStorage ?? liveFlytrapStorage
}

function isSerializable(input: any) {
	superJsonRegisterCustom(SuperJSON)
	const { error } = tryCatchSync(() => SuperJSON.stringify(input))
	return error === null
}

export function removeIllegalValues(captures: (CapturedCall | CapturedFunction)[]) {
	const capturesClone = copy(captures)

	for (let i = 0; i < capturesClone.length; i++) {
		for (let j = 0; j < capturesClone[i].invocations.length; j++) {
			// Args
			if (!isSerializable(capturesClone[i].invocations[j].args)) {
				capturesClone[i].invocations[j].args = capturesClone[i].invocations[j].args.map(
					() => FLYTRAP_UNSERIALIZABLE_VALUE
				)
			}
			// Output
			if (!isSerializable(capturesClone[i].invocations[j].output)) {
				capturesClone[i].invocations[j].output = FLYTRAP_UNSERIALIZABLE_VALUE
			}
			// Error
			if (!isSerializable(capturesClone[i].invocations[j].error)) {
				capturesClone[i].invocations[j].error = {
					name: FLYTRAP_UNSERIALIZABLE_VALUE,
					message: FLYTRAP_UNSERIALIZABLE_VALUE,
					stack: FLYTRAP_UNSERIALIZABLE_VALUE
				}
			}
		}
	}
	return capturesClone
}
