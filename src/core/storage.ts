import type {
	CaptureDecryptedAndRevived,
	CapturePayload,
	CapturedCall,
	CapturedFunction,
	DatabaseCapture,
	Storage
} from './types'
import { getApiBase, getLoadedConfig } from './config'
import { getUserId } from '../index'
import {
	empty,
	formatBytes,
	get,
	parseCaptureAmountLimit,
	parseFilepathFromFunctionId,
	post,
	sortCapturesByTimestamp,
	tryCatchSync
} from './util'
import SuperJSON from 'superjson'
import { FLYTRAP_UNSERIALIZABLE_VALUE, NO_SOURCE } from './constants'
import { encrypt } from './encryption'
import { log } from './logging'
import { serializeError } from 'serialize-error'
import {
	addLinksToCaptures,
	decryptCapture,
	extractArgs,
	extractOutputs,
	getCaptureSize,
	parse,
	processCaptures,
	removeCircularDependencies,
	stringify,
	superJsonRegisterCustom
} from './stringify'
import { shouldIgnoreCapture } from './captureIgnores'
import { filePersistence, getPersistence } from './persistence/isomorphic'
import { createHumanLog } from './errors'

const loadedCaptures = new Map<string, CaptureDecryptedAndRevived | undefined>()

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
		getPersistence().setItem(captureId, capture)
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

function findWithLatestErrorInvocation<T extends CapturedCall | CapturedFunction>(
	capturedFunctions: T[]
): T | undefined {
	let latestFunction: T | undefined
	let latestTimestamp = -Infinity

	capturedFunctions.forEach((func) => {
		func.invocations.forEach((invocation) => {
			if (invocation.error && invocation.timestamp > latestTimestamp) {
				latestTimestamp = invocation.timestamp
				latestFunction = func
			}
		})
	})

	return latestFunction
}

export const liveFlytrapStorage: FlytrapStorage = {
	getCapture(captureId) {
		return getPersistence().getItem(captureId)
	},
	async loadCapture(captureId, secretApiKey, privateKey) {
		if (loadedCaptures.has(captureId)) {
			return loadedCaptures.get(captureId)
		}
		loadedCaptures.set(captureId, undefined) // mark it as being loaded

		const { data, error } = await get<DatabaseCapture>(
			`${getApiBase()}/api/v1/captures/${captureId}`,
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
					events: ['replay_failed'],
					explanations: ['api_unreachable'],
					solutions: ['try_again_contact_us']
				})
				throw errorLog.toString()
			}

			if (error?.includes('UNAUTHORIZED')) {
				const errorLog = createHumanLog({
					events: ['replay_failed'],
					explanations: ['api_unauthorized']
				})
				throw errorLog.toString()
			}

			const errorLog = createHumanLog({
				events: ['replay_failed'],
				explanations: ['generic_unexpected_error'],
				solutions: ['try_again_contact_us']
			})
			throw errorLog.toString()
		}

		const decryptedCapture = await decryptCapture(data, privateKey)

		log.info('storage', `Loaded capture ID "${captureId}".`)

		loadedCaptures.set(captureId, decryptedCapture)
		return decryptedCapture
	},
	async saveCapture(functions, calls, error?) {
		const { publicApiKey, projectId, captureIgnores, mode, captureAmountLimit } =
			(await getLoadedConfig()) ?? {}

		// We want troubleshooting mode to work even without
		// proper `publicApiKey` and `projectId` setup.

		if (mode === 'troubleshoot') {
			const lastErroredFunction = findWithLatestErrorInvocation(functions)
			const lastErroredCall = findWithLatestErrorInvocation(calls)

			const troubleshootingErrorLog = createHumanLog({
				events: ['troubleshooting_error_captured'],
				explanations: ['troubleshooting_capture_explanation'],
				solutions: ['troubleshooting_open_issue', 'troubleshooting_join_discord'],
				params: {
					lastErroredFunctionId: lastErroredFunction?.id ?? 'undefined',
					lastErroredCallId: lastErroredCall?.id ?? 'undefined'
				}
			})

			console.error(troubleshootingErrorLog.toString())
			return
		}

		if (!publicApiKey || !projectId || empty(publicApiKey, projectId)) {
			console.error(
				createHumanLog({
					events: ['capture_failed'],
					explanations: ['replay_missing_config_values'],
					solutions: ['configuration_fix']
				}).toString()
			)
			return
		}

		calls = removeIllegalValues(calls)
		functions = removeIllegalValues(functions)

		calls = processCaptures(calls)
		functions = processCaptures(functions)

		// Remove the circular from `calls` and `functions`
		for (let i = 0; i < calls.length; i++) {
			for (let j = 0; j < calls[i].invocations.length; j++) {
				calls[i].invocations[j].args = calls[i].invocations[j].args.map((a) =>
					removeCircularDependencies(a)
				)
				calls[i].invocations[j].output = removeCircularDependencies(calls[i].invocations[j].output)
			}
		}
		for (let i = 0; i < functions.length; i++) {
			for (let j = 0; j < functions[i].invocations.length; j++) {
				functions[i].invocations[j].args = functions[i].invocations[j].args.map((a) =>
					removeCircularDependencies(a)
				)
				functions[i].invocations[j].output = removeCircularDependencies(
					functions[i].invocations[j].output
				)
			}
		}

		// Handle capture amount limits
		if (captureAmountLimit) {
			const parsedCaptureAmountLimit = parseCaptureAmountLimit(captureAmountLimit)
			if (parsedCaptureAmountLimit.err) {
				// @todo: human-friendly error
				console.error(parsedCaptureAmountLimit.val)
			} else {
				functions = sortCapturesByTimestamp(functions)
				calls = sortCapturesByTimestamp(calls)

				const combinedFunctionsAndCalls = [...functions, ...calls]
				const sortedCombined = sortCapturesByTimestamp(combinedFunctionsAndCalls)

				if (parsedCaptureAmountLimit.val.type === 'files') {
					const fileNamesSet = new Set<string>()

					for (let i = 0; i < sortedCombined.length; i++) {
						const currentFunctionOrCall = sortedCombined.at(-(i + 1))
						if (!currentFunctionOrCall) {
							return
						}

						const filepath = parseFilepathFromFunctionId(currentFunctionOrCall.id).unwrap()
						fileNamesSet.add(filepath)
						if (fileNamesSet.size >= parsedCaptureAmountLimit.val.fileLimit) {
							break
						}
					}

					// Use the filepaths of N latest to filter calls and functions
					calls = calls.filter((call) => {
						const parsedFilepath = parseFilepathFromFunctionId(call.id).unwrap()
						if (fileNamesSet.has(parsedFilepath)) {
							return true
						}
						return false
					})

					functions = functions.filter((func) => {
						const parsedFilepath = parseFilepathFromFunctionId(func.id).unwrap()
						if (fileNamesSet.has(parsedFilepath)) {
							return true
						}
						return false
					})
				} else {
					const duplicateCalls: typeof calls = []
					const duplicateFunctions: typeof functions = []

					let sizeCounter = 0

					for (let i = 0; i < Math.max(calls.length, functions.length); i++) {
						if (sizeCounter >= parsedCaptureAmountLimit.val.sizeLimit) {
							break
						}

						const callEntry = calls.at(-(i + 1))
						const functionEntry = functions.at(-(i + 1))

						if (callEntry) {
							duplicateCalls.push(callEntry)
							sizeCounter += getCaptureSize(callEntry)
						}

						if (functionEntry) {
							duplicateFunctions.push(functionEntry)
							sizeCounter += getCaptureSize(functionEntry)
						}
					}

					calls = duplicateCalls
					functions = duplicateFunctions
				}
			}
		}

		const args = [...extractArgs(calls), ...extractArgs(functions)]
		const outputs = [...extractOutputs(calls), ...extractOutputs(functions)]

		const linkedCalls = addLinksToCaptures(calls, { args, outputs })
		const linkedFunctions = addLinksToCaptures(functions, { args, outputs })

		const payload: CapturePayload = {
			capturedUserId: getUserId(),
			projectId,
			functionName:
				typeof error === 'string'
					? error
					: serializeError(error)?.message ?? serializeError(error)?.name ?? 'unknown',
			source: NO_SOURCE,
			// args, outputs,
			args: await encrypt(publicApiKey, stringify(args)),
			outputs: await encrypt(publicApiKey, stringify(outputs)),
			calls: linkedCalls,
			functions: linkedFunctions,
			...(error && {
				error: await encrypt(publicApiKey, stringify(serializeError(error)))
			})
		}

		// Capture ignores
		if (captureIgnores) {
			if (shouldIgnoreCapture(payload, captureIgnores)) {
				log.info('storage', `Ignored capture with name "${payload.functionName}"`)
				return
			}
		}

		const { data: stringifiedPayload, error: stringifyError } = tryCatchSync(() =>
			stringify(payload)
		)

		if (stringifyError || !stringifiedPayload) {
			const errorLog = createHumanLog({
				events: ['capture_failed'],
				explanations: ['stringify_capture_failed'],
				solutions: ['stringify_capture_failed_solution']
			})
			console.error(errorLog.toString())
			console.error(stringifyError)
			return
		}

		const { error: captureError } = await post(
			`${getApiBase()}/api/v1/captures`,
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
				events: ['capture_failed'],
				explanations: ['api_capture_error_response'],
				solutions: ['try_again_contact_us']
			})
			console.error(errorLog.toString())
			console.error(captureError)
		} else {
			log.info(
				'storage',
				`Saved capture with name "${payload.functionName}". Payload Size: ${formatBytes(
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
	const capturesClone = captures

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
