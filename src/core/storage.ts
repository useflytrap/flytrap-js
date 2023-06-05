import type {
	CaptureDecrypted,
	CapturePayload,
	CapturedCall,
	CapturedFunction,
	DatabaseCapture,
	Storage
} from './types'
import { FLYTRAP_API_BASE, getLoadedConfig } from './config'
import { getUserId } from '../index'
import { empty, get, post, tryCatch, tryCatchSync } from './util'
import { createHumanLog } from './human-logs'
import SuperJSON from 'superjson'
import { FLYTRAP_UNSERIALIZABLE_VALUE, NO_SOURCE } from './constants'
import { decrypt, encrypt } from './encryption'
import { log } from './logging'
import { serializeError } from 'serialize-error'
import { parse, stringify, superJsonRegisterCustom } from './stringify'

const loadedCaptures = new Map<string, CaptureDecrypted | undefined>()

export const browserStorage: Storage = {
	getItem(captureId) {
		const captureStringified = localStorage.getItem(captureId)
		if (!captureStringified) return null
		return parse<CaptureDecrypted>(captureStringified)
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
			return parse<CaptureDecrypted>(captureStringified)
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
	getCapture: (captureId: string) => CaptureDecrypted | null
	/**
	 * Load the wrapped functions from the API. These are decrypted before
	 * returning them.
	 * @returns
	 */
	loadCapture: (
		captureId: string,
		secretApiKey: string,
		privateKey: string
	) => Promise<CaptureDecrypted | undefined>
	saveCapture: (functions: CapturedFunction[], calls: CapturedCall[], error?: any) => Promise<void>
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

		log.info(
			'api-calls',
			`[GET] ${FLYTRAP_API_BASE}/api/v1/captures/${captureId} - Received ${data}`
		)

		// Decrypt capture
		const decryptedCapture: CaptureDecrypted = {
			...data,
			calls: await Promise.all(
				data.calls.map(async (encryptedCall) => ({
					...encryptedCall,
					args: parse(await decrypt(privateKey, encryptedCall.args)),
					...(encryptedCall.output && {
						output: parse(await decrypt(privateKey, encryptedCall.output))
					}),
					...(encryptedCall.error && {
						error: parse<any>(await decrypt(privateKey, encryptedCall.error))
					})
				}))
			),
			functions: await Promise.all(
				data.functions.map(async (encryptedFunction) => ({
					...encryptedFunction,
					args: parse(await decrypt(privateKey, encryptedFunction.args)),
					...(encryptedFunction.output && {
						output: parse(await decrypt(privateKey, encryptedFunction.output))
					}),
					...(encryptedFunction.error && {
						error: parse<any>(await decrypt(privateKey, encryptedFunction.error))
					})
				}))
			),
			...(data.error && {
				error: parse<any>(await decrypt(privateKey, data.error))
			})
		}

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

		// TODO: Rewrite this
		const [processedFunctions, processedCalls, processededError] = preprocessCapture(
			functions,
			calls,
			error
		)

		const { data: payload, error: encryptError } = await tryCatch<CapturePayload>({
			capturedUserId: getUserId(),
			projectId,
			functionName:
				serializeError(processededError)?.message ??
				serializeError(processededError)?.error ??
				'unknown',
			source: NO_SOURCE,
			calls: await Promise.all(
				processedCalls.map(
					async (processedCall) => await encryptCapturedCall(processedCall, publicApiKey)
				)
			),
			functions: await Promise.all(
				processedFunctions.map(
					async (processedFunc) => await encryptCapturedFunction(processedFunc, publicApiKey)
				)
			),
			...(error && {
				error: await encrypt(publicApiKey, stringify(serializeError(processededError)))
			})
		})

		if (!payload || encryptError) {
			const errorLog = createHumanLog({
				event: 'capture_failed',
				explanation: 'stringify_capture_failed',
				solution: 'critical_contact_us'
			})
			console.error(errorLog.toString())
			console.error((encryptError as Error).message)
			return
		}

		const { data: stringifiedPayload, error: stringifyError } = tryCatchSync(() =>
			stringify(payload)
		)
		if (stringifyError || !stringifiedPayload) {
			const errorLog = createHumanLog({
				event: 'capture_failed',
				explanation: 'stringify_capture_failed',
				solution: 'stringify_capture_failed_solution'
			})
			console.error(errorLog.toString())
			console.error((stringifyError as Error).message)
			return
		}

		log.info(
			'api-calls',
			`[POST] ${FLYTRAP_API_BASE}/api/v1/captures - Payload size ~${stringifiedPayload.length} bytes.`
		)
		log.info(
			'storage',
			`[POST] ${FLYTRAP_API_BASE}/api/v1/captures - Payload size ~${stringifiedPayload.length} bytes.`
		)
		// TODO: use something like `devalue` to get closer to reality
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
			console.error('Capture error:')
			console.error(captureError)

			const errorLog = createHumanLog({
				event: 'capture_failed',
				explanation: 'api_capture_error_response',
				solution: 'try_again_contact_us'
			})
			console.error(errorLog.toString())
		}
	}
}

export function getFlytrapStorage(flytrapStorage?: FlytrapStorage) {
	return flytrapStorage ?? liveFlytrapStorage
}

function isSerializable(input: any) {
	superJsonRegisterCustom()
	const { error } = tryCatchSync(() => SuperJSON.stringify(input))
	return error === null
}

export async function encryptCapturedFunction(
	capturedFunction: CapturedFunction,
	publicApiKey: string
) {
	const { args, error, output, ...rest } = capturedFunction

	return {
		args: await encrypt(publicApiKey, stringify(args)),
		...(error && { error: await encrypt(publicApiKey, stringify(error)) }),
		...(output && { output: await encrypt(publicApiKey, stringify(output)) }),
		...rest
	}
}

export async function encryptCapturedCall(capturedCall: CapturedCall, publicApiKey: string) {
	const { args, error, output, ...rest } = capturedCall

	return {
		args: await encrypt(publicApiKey, stringify(args)),
		...(error && { error: await encrypt(publicApiKey, stringify(error)) }),
		...(output && { output: await encrypt(publicApiKey, stringify(output)) }),
		...rest
	}
}

export function preprocessCapture(
	functions: CapturedFunction[],
	calls: CapturedCall[],
	error?: any
) {
	// Iterate over calls and functions
	const funcsCopy = [...functions]
	let callsCopy = [...calls].sort((callA, callB) => callA.timestamp - callB.timestamp).reverse()

	let size = 0
	for (let i = 0; i < callsCopy.length; i++) {
		if (!isSerializable(callsCopy[i])) {
			if (!isSerializable(callsCopy[i].args)) {
				callsCopy[i].args = callsCopy[i].args.map(() => FLYTRAP_UNSERIALIZABLE_VALUE)
			}
			if (!isSerializable(callsCopy[i].output)) {
				callsCopy[i].output = FLYTRAP_UNSERIALIZABLE_VALUE
			}
		}
		tryCatchSync(() => {
			size += SuperJSON.stringify(callsCopy[i]).length
			if (size >= 3_000_000) {
				// Remove the rest
				callsCopy = callsCopy.slice(0, i)
			}
		})
	}

	for (let i = 0; i < funcsCopy.length; i++) {
		if (!isSerializable(funcsCopy[i])) {
			if (!isSerializable(funcsCopy[i].args)) {
				funcsCopy[i].args = funcsCopy[i].args.map(() => FLYTRAP_UNSERIALIZABLE_VALUE)
			}
			if (!isSerializable(funcsCopy[i].output)) {
				funcsCopy[i].output = FLYTRAP_UNSERIALIZABLE_VALUE
			}
		}
	}
	return [funcsCopy, callsCopy, error] as const
}
