import { serializeError } from 'serialize-error'
import {
	CaptureDecrypted,
	CapturedCall,
	CapturedFunction,
	FlytrapCallOptions,
	FlytrapFunctionOptions
} from './core/types'
import {
	fillUnserializableFlytrapValues,
	getMode,
	isAsyncFunction,
	tryCatch,
	tryCatchSync
} from './core/util'
import { getFlytrapStorage, getLoadedCapture, loadAndPersist } from './core/storage'
import { createHumanLog } from './core/human-logs'
import { log } from './core/logging'
import { getLoadedConfig } from './core/config'

/**
 * All function definitions are wrapped with the useFlytrapFunction
 */
export function useFlytrapFunction<
	T extends ((...args: any) => Promise<any>) | ((...args: any) => any)
>(fn: T, opts: FlytrapFunctionOptions) {
	if (isAsyncFunction(fn)) {
		// Return async function
		return async (...args: any[]) => {
			addExecutingFunction({
				id: opts.id,
				args: [...args],
				timestamp: Date.now()
			})

			// Replaying code
			if (getMode() === 'replay') {
				const replayArgs = getReplayFunctionArgs(opts.id)
				const replayOutput = getReplayFunctionOutput(opts.id)

				if (!replayArgs) {
					if (getLoadedCapture()) {
						console.warn(
							`Could not find replay input arguments for function with ID ${opts.id}, either this is a function you have added, or something has gone wrong during the capture process. If this is the case, contact us.`
						)
					}
					return await fn(...args)
				}

				// Merge replay args & real args
				const mergedArgs = fillUnserializableFlytrapValues(replayArgs, args)
				const realOutput = await fn(...mergedArgs)
				return fillUnserializableFlytrapValues(replayOutput, realOutput)
			}
			// Capturing bugs
			try {
				const output = await fn(...args)
				saveOutputForFunction(opts.id, output)
				return output
			} catch (error) {
				/**
				 * Oops! We found a bug, let's send the current
				 * executing function along with its data to the
				 * Flytrap API.
				 */
				saveErrorForFunction(opts.id, error)

				const { error: saveError } = await tryCatch(
					getFlytrapStorage().saveCapture(_executingFunctions, _functionCalls, error)
				)
				if (saveError) {
					console.error(
						createHumanLog({
							event: 'capture_failed',
							explanation: 'api_capture_error_response',
							solution: 'try_again_contact_us'
						})
					)
					console.error(saveError)
				}

				throw error
			}
		}
	}

	// Return normal function
	return (...args: any[]) => {
		addExecutingFunction({
			id: opts.id,
			args: [...args],
			timestamp: Date.now()
		})

		// Replaying code
		if (getMode() === 'replay') {
			const replayArgs = getReplayFunctionArgs(opts.id)
			const replayOutput = getReplayFunctionOutput(opts.id)
			if (!replayArgs) {
				if (getLoadedCapture()) {
					console.warn(
						`Could not find replay input arguments for function with ID ${opts.id}, either this is a function you have added, or something has gone wrong during the capture process. If this is the case, contact us.`
					)
				}
				return fn(...args)
			}

			// Merge replay args & real args
			const mergedArgs = fillUnserializableFlytrapValues(replayArgs, args)
			const realOutput = fn(...mergedArgs)
			return fillUnserializableFlytrapValues(replayOutput, realOutput)
		}

		// We're capturing
		try {
			const output = fn(...args)
			saveOutputForFunction(opts.id, output)
			return output
		} catch (error) {
			/**
			 * Oops! We found a bug, let's send the current
			 * executing function along with its data to the
			 * Flytrap API.
			 */
			saveErrorForFunction(opts.id, error)

			const { error: saveError } = tryCatchSync(() =>
				getFlytrapStorage().saveCapture(_executingFunctions, _functionCalls, error)
			)
			if (saveError) {
				const errorLog = createHumanLog({
					event: 'capture_failed',
					explanation: 'generic_unexpected_error',
					solution: 'try_again_contact_us'
				})
				console.error(errorLog.toString())
			}

			throw error
		}
	}
}

async function executeFunctionAsync<T>(fn: T, name: string, args: any[]) {
	log.info('call-execution', `Executing async function ${name}()`)
	// @ts-ignore
	if (fn?.[name]) {
		if (typeof fn === 'object' && typeof (fn as any)?.[name] === 'function') {
			// @ts-ignore
			return await fn[name].call(fn, ...args)
		}

		// @ts-ignore
		return await fn[name](...args)
	} else {
		// @ts-ignore
		return await fn(...args)
	}
}

function executeFunction<T>(fn: T, name: string, args: any[]) {
	log.info('call-execution', `Executing function ${name}()`)
	// @ts-ignore
	if (fn?.[name]) {
		if (typeof fn === 'object' && typeof (fn as any)?.[name] === 'function') {
			// @ts-ignore
			return fn[name].call(fn, ...args)
		}

		// @ts-ignore
		return fn[name](...args)
	} else {
		// @ts-ignore
		return fn(...args)
	}
}

export function useFlytrapCall<T>(fnOrNamespace: T, opts: FlytrapCallOptions): any {
	try {
		// Save input
		saveFunctionCall(opts)

		// We're replaying
		if (getMode() === 'replay') {
			const replayArgs = getReplayCallArgs(opts.id)
			const replayOutput = getReplayCallOutput(opts.id)
			if (!replayArgs) {
				if (getLoadedCapture()) {
					console.warn(
						`Could not find replay input arguments for function call with ID ${opts.id}, either this is a new function call you have added, or something has gone wrong during the capture process. If this is the case, contact us.`
					)
				}
				// return fn(...opts.args)
				return executeFunction(fnOrNamespace, opts.name, opts.args)
			}

			// Merge args replay & real args
			const mergedArgs = fillUnserializableFlytrapValues(replayArgs, opts.args)
			const realOutput = executeFunction(fnOrNamespace, opts.name, mergedArgs)
			return fillUnserializableFlytrapValues(replayOutput, realOutput)
		}
		// We're capturing
		const output = executeFunction(fnOrNamespace, opts.name, opts.args)
		saveOutputForFunctionCall(opts.id, output)

		return output
	} catch (error) {
		/**
		 * Oops! We found a bug, let's send the current
		 * executing function along with its data to the
		 * Flytrap API.
		 */
		saveErrorForFunctionCall(opts.id, error)

		throw error
	}
}

export async function useFlytrapCallAsync<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	opts: FlytrapCallOptions
) {
	try {
		// Save input
		saveFunctionCall(opts)

		// We're replaying
		if (getMode() === 'replay') {
			const replayArgs = getReplayCallArgs(opts.id)
			const replayOutput = getReplayCallOutput(opts.id)
			if (!replayArgs) {
				if (getLoadedCapture()) {
					console.warn(
						`Could not find replay input arguments for function call with ID ${opts.id}, either this is a function call you have added, or something has gone wrong during the capture process. If this is the case, contact us.`
					)
				}
				return await executeFunctionAsync(fn, opts.name, opts.args)
			}

			// Merge replay args & real args
			const mergedArgs = fillUnserializableFlytrapValues(replayArgs, opts.args)
			const realOutput = await executeFunctionAsync(fn, opts.name, mergedArgs)
			return fillUnserializableFlytrapValues(replayOutput, realOutput)
		}
		// We're capturing
		// const output = await fn(...opts.args)
		const output = await executeFunctionAsync(fn, opts.name, opts.args)
		saveOutputForFunctionCall(opts.id, output)

		return output
	} catch (error) {
		/**
		 * Oops! We found a bug, let's send the current
		 * executing function along with its data to the
		 * Flytrap API.
		 */
		saveErrorForFunctionCall(opts.id, error)

		throw error
	}
}

function getReplayCallArgs(functionCallId: string): any[] | undefined {
	const loadedCapture = getLoadedCapture()
	if (!loadedCapture) {
		loadCapture()
		return undefined
	}

	const matchingFunctionCalls = loadedCapture.calls
		.filter((call) => call.id === functionCallId)
		.sort((a, b) => b.timestamp - a.timestamp)
	return matchingFunctionCalls[0]?.args
}

function getReplayCallOutput(functionCallId: string): any | undefined {
	const loadedCapture = getLoadedCapture()
	if (!loadedCapture) {
		loadCapture()
		return undefined
	}

	const matchingFunctionCalls = loadedCapture.calls
		.filter((call) => call.id === functionCallId)
		.sort((a, b) => b.timestamp - a.timestamp)
	return matchingFunctionCalls[0]?.output
}

function getReplayFunctionArgs(functionId: string): any[] | undefined {
	const loadedCapture = getLoadedCapture()
	if (!loadedCapture) {
		loadCapture()
		return undefined
	}

	const matchingFunctionCalls = loadedCapture.functions
		.filter((func) => func.id === functionId)
		.sort((a, b) => b.timestamp - a.timestamp)
	return matchingFunctionCalls?.[0]?.args
}

function getReplayFunctionOutput(functionId: string): any | undefined {
	const loadedCapture = getLoadedCapture()
	if (!loadedCapture) {
		loadCapture()
		return undefined
	}

	const matchingFunctionCalls = loadedCapture.functions
		.filter((func) => func.id === functionId)
		.sort((a, b) => b.timestamp - a.timestamp)
	return matchingFunctionCalls?.[0]?.output
}

let _executingFunctions: CapturedFunction[] = []
let _functionCalls: CapturedCall[] = []
let _userId: string | undefined = undefined

export const getExecutingFunctions = () => _executingFunctions
export const getFunctionCalls = () => _functionCalls

export const _resetExecutingFunctions = () => {
	_executingFunctions = []
}

export const _resetFunctionCalls = () => {
	_functionCalls = []
}

export async function loadCapture() {
	const { privateKey, secretApiKey, captureId } = (await getLoadedConfig()) ?? {}
	if (!captureId || !secretApiKey || !privateKey) {
		log.error(
			'storage',
			`Failed to load capture, because captureId, secretApiKey or privateKey is undefined.`
		)
		return
	}
	const success = await loadAndPersist(captureId, secretApiKey, privateKey)

	if (success) {
		log.info('storage', '🐛 Flytrap - Replay data loaded!')
	} else {
		log.error('storage', `Could not load replay data for capture ID ${captureId}`)
	}
}

export async function capture(error: any) {
	log.info('capture', `Manually captured error.`)
	/**
	 * We're manually capturing an error. Let's send the current
	 * executing function along with its data to the Flytrap API.
	 */
	const executingFunction = getExecutingFunction()
	if (executingFunction) {
		saveErrorForFunction(executingFunction.id, error)
	}

	// Let's save it
	const { error: saveError } = await tryCatch(
		getFlytrapStorage().saveCapture(_executingFunctions, _functionCalls, error)
	)
	if (saveError) {
		const errorLog = createHumanLog({
			event: 'capture_failed',
			explanation: 'generic_unexpected_error',
			solution: 'try_again_contact_us'
		})
		console.error(errorLog.toString())
	}
}

export function identify(userId: string) {
	log.info('identify', `Identified current user as "${userId}"`)
	_userId = userId
}
export const getUserId = () => _userId
export const getExecutingFunction = (): CapturedFunction | undefined =>
	_executingFunctions[_executingFunctions.length - 1]
const addExecutingFunction = (wrappedFunction: CapturedFunction) => {
	log.info('function-execution', `Executing function with ID "${wrappedFunction.id}"`)
	const matchingExecutingFunction = _executingFunctions.find(
		(execFn) => execFn.id === wrappedFunction.id
	)
	if (matchingExecutingFunction) {
		// Update timestamp of execution
		matchingExecutingFunction.timestamp = Date.now()
		return
	}
	_executingFunctions.push(wrappedFunction)
}

function saveFunctionCall(opts: FlytrapCallOptions) {
	_functionCalls.push({
		...opts,
		timestamp: Date.now()
	})
}

function saveOutputForFunctionCall<T>(functionCallId: string, output: T) {
	// @ts-ignore for some reason this isn't included
	const functionCallIndex = _functionCalls.findLastIndex((call) => call.id === functionCallId)

	if (functionCallIndex === -1) {
		console.error(`Saving output for nonexistent function call with ID ${functionCallId}`)
		return
	}

	_functionCalls[functionCallIndex].output = output
}

function saveOutputForFunction<T>(functionId: string, output: T) {
	// @ts-ignore for some reason this isn't included
	const functionIndex = _executingFunctions.findLastIndex((func) => func.id === functionId)

	if (functionIndex === -1) {
		console.error(`Saving output for nonexistent function with ID ${functionId}`)
		return
	}

	_executingFunctions[functionIndex].output = output
}

function getFunctionCallById(functionCallId: string): CapturedCall | undefined {
	return _functionCalls.find((call) => call.id === functionCallId)
}

function getFunctionById(functionId: string): CapturedFunction | undefined {
	return _executingFunctions.find((func) => func.id === functionId)
}

function saveErrorForFunctionCall(functionCallId: string, error: any) {
	const call = getFunctionCallById(functionCallId)

	if (!call) {
		console.error(`Saving error for nonexistent function call with ID ${functionCallId}`)
		return
	}
	log.info('call-execution', `Saving error for function call ID ${functionCallId}.`)
	call.error = serializeError(error)
}

function saveErrorForFunction(functionId: string, error: any) {
	const func = getFunctionById(functionId)

	if (!func) {
		console.error(`Saving error for nonexistent function with ID ${functionId}`)
		return
	}

	log.info('function-execution', `Saving error for function ID ${functionId}`)
	func.error = serializeError(error)
}

// Export
export * from './core/config'
export * from './core/types'
export * from './core/encryption'
