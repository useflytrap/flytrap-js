import type {
	CaptureDecrypted,
	CapturePayload,
	CapturedCall,
	CapturedFunction,
	DatabaseCapture
} from './types'
import { getFlytrapConfig } from './config'
import { getExecutingFunction, getUserId } from '../index'
import { empty, get, post, tryCatch, tryCatchSync } from './util'
import { createHumanLog } from './human-logs'
import SuperJSON from 'superjson'
import { FLYTRAP_UNSERIALIZABLE_VALUE, NO_SOURCE } from './constants'
import { decrypt, encrypt } from './encryption'
import { log } from './logging'

const loadedCaptures = new Map<string, CaptureDecrypted | undefined>()

export type FlytrapStorage = {
	/**
	 * Load the wrapped functions from the API. These are decrypted before
	 * returning them.
	 * @returns
	 */
	loadCapture: () => Promise<CaptureDecrypted | undefined>
	saveCapture: (functions: CapturedFunction[], calls: CapturedCall[], error?: any) => Promise<void>
}

export const liveFlytrapStorage: FlytrapStorage = {
	async loadCapture() {
		const { publicApiKey, secretApiKey, privateKey, captureId, projectId } =
			await getFlytrapConfig()

		if (
			!publicApiKey ||
			!captureId ||
			!projectId ||
			!privateKey ||
			!secretApiKey ||
			empty(publicApiKey, captureId, projectId, secretApiKey, privateKey)
		) {
			const errorLog = createHumanLog({
				event: 'replay_failed',
				explanation: 'replay_missing_config_values',
				solution: 'configuration_fix'
			})
			log.error('storage', errorLog.toString())
			throw errorLog.toString()
		}

		if (loadedCaptures.has(captureId)) return
		loadedCaptures.set(captureId, undefined) // mark it as being loaded

		const { data, error } = await get<DatabaseCapture>(
			`https://www.useflytrap.com/api/v1/captures/${captureId}`,
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

		// Decrypt capture
		const decryptedCapture: CaptureDecrypted = {
			...data,
			calls: SuperJSON.parse(await decrypt(privateKey, data.calls)),
			functions: SuperJSON.parse(await decrypt(privateKey, data.functions)),
			...(data.error && {
				error: SuperJSON.parse(await decrypt(privateKey, data.error)) as any
			})
		}

		log.info('storage', `Loaded capture ID "${captureId}".`)

		loadedCaptures.set(captureId, decryptedCapture)
		return decryptedCapture
	},
	async saveCapture(functions, calls, error?) {
		// Here error if
		const { publicApiKey, projectId } = await getFlytrapConfig()

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

		const [processedFunctions, processedCalls, processededError] = preprocessCapture(
			functions,
			calls,
			error
		)

		const { data: payload, error: encryptError } = await tryCatch<CapturePayload>({
			capturedUserId: getUserId(),
			projectId,
			functionName: getExecutingFunction()?.name ?? 'unknown',
			source: getExecutingFunction()?.source ?? NO_SOURCE,
			calls: await encrypt(publicApiKey, SuperJSON.stringify(processedCalls)),
			functions: await encrypt(publicApiKey, SuperJSON.stringify(processedFunctions)),
			...(error && { error: await encrypt(publicApiKey, SuperJSON.stringify(processededError)) })
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
			SuperJSON.stringify(payload)
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
			`[POST] https://www.useflytrap.com/api/v1/captures - Payload size ~${stringifiedPayload.length} bytes.`
		)
		log.info(
			'storage',
			`[POST] https://www.useflytrap.com/api/v1/captures - Payload size ~${stringifiedPayload.length} bytes.`
		)
		// TODO: use something like `devalue` to get closer to reality
		const { error: captureError } = await post(
			`https://www.useflytrap.com/api/v1/captures`,
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
	const { error } = tryCatchSync(() => SuperJSON.stringify(input))
	return error === null
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
				callsCopy[i].args = [FLYTRAP_UNSERIALIZABLE_VALUE]
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
				funcsCopy[i].args = [FLYTRAP_UNSERIALIZABLE_VALUE]
			}
		}
	}
	return [funcsCopy, callsCopy, error] as const
}
