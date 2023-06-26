import { serializeError } from 'serialize-error'
import {
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
import { CaptureInvocation } from './exports'

/**
 * All function definitions are wrapped with the useFlytrapFunction
 */
export function useFlytrapFunction<
	T extends ((...args: any) => Promise<any>) | ((...args: any) => any)
>(fn: T, opts: FlytrapFunctionOptions) {
	if (isAsyncFunction(fn)) {
		// Return async function
		return async function (...args: any[]) {
			addFunctionInvocation(opts.id, {
				args,
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
				// const realOutput = await fn(...mergedArgs)
				// @ts-expect-error for some reason `this as any` still gives error
				const realOutput = await executeFunctionAsync(fn, this as any, mergedArgs)
				return fillUnserializableFlytrapValues(replayOutput, realOutput)
			}
			// Capturing bugs
			try {
				// const output = await fn(...args)
				// @ts-expect-error for some reason `this as any` still gives error
				const output = await executeFunctionAsync(fn, this as any, args)
				saveOutputForFunction(opts.id, output)
				return output
			} catch (error) {
				/**
				 * Oops! We found a bug, let's send the current
				 * executing function along with its data to the
				 * Flytrap API.
				 */
				saveErrorForFunction(opts.id, error)
				log.info('capture', `Captured error in async function with ID "${opts.id}".`, { error })
				const { error: saveError } = await tryCatch(
					getFlytrapStorage().saveCapture(_executingFunctions, _functionCalls, error as Error)
				)
				if (saveError) {
					console.error(
						createHumanLog({
							event: 'capture_failed',
							explanation: 'api_capture_error_response',
							solution: 'try_again_contact_us'
						}).toString()
					)
					console.error(saveError)
				}

				throw error
			}
		}
	}

	// Return normal function
	return function (...args: any[]) {
		addFunctionInvocation(opts.id, {
			args,
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
				// return fn(...args)
				// @ts-expect-error for some reason `this as any` still gives error
				return executeFunction(fn, this as any, args)
			}

			// Merge replay args & real args
			const mergedArgs = fillUnserializableFlytrapValues(replayArgs, args)
			// const realOutput = fn(...mergedArgs)
			// @ts-expect-error for some reason `this as any` still gives error
			const realOutput = executeFunction(fn, this as any, mergedArgs)
			return fillUnserializableFlytrapValues(replayOutput, realOutput)
		}

		// We're capturing
		try {
			// @ts-expect-error for some reason `this as any` still gives error
			const output = executeFunction(fn, this as any, args)
			saveOutputForFunction(opts.id, output)
			return output
		} catch (error) {
			/**
			 * Oops! We found a bug, let's send the current
			 * executing function along with its data to the
			 * Flytrap API.
			 */
			saveErrorForFunction(opts.id, error)
			log.info('capture', `Captured error in function with ID "${opts.id}".`, { error })
			const { error: saveError } = tryCatchSync(() =>
				getFlytrapStorage().saveCapture(_executingFunctions, _functionCalls, error as Error)
			)
			if (saveError) {
				const errorLog = createHumanLog({
					event: 'capture_failed',
					explanation: 'generic_unexpected_error',
					solution: 'try_again_contact_us'
				})
				console.error(errorLog.toString())
				console.error(saveError)
			}

			throw error
		}
	}
}

async function executeFunctionAsync<T extends Function>(fn: T, thisArg: any, args: any[]) {
	log.info('function-execution', `Executing function ${fn.name ?? 'anonymous'}()`, { args })
	return await fn.call(thisArg, ...args)
}

function executeFunction<T extends Function>(fn: T, thisArg: any, args: any[]) {
	log.info('function-execution', `Executing function ${fn.name ?? 'anonymous'}()`, { args })
	return fn.call(thisArg, ...args)
}

async function executeFunctionCallAsync<T>(fn: T, name: string, args: any[]) {
	log.info('call-execution', `Executing async function ${name}()`, { args })
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

function executeFunctionCall<T>(fn: T, name: string, args: any[]) {
	log.info('call-execution', `Executing function ${name}()`, { args })
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
				return executeFunctionCall(fnOrNamespace, opts.name, opts.args)
			}

			// Merge args replay & real args
			const mergedArgs = fillUnserializableFlytrapValues(replayArgs, opts.args)
			const realOutput = executeFunctionCall(fnOrNamespace, opts.name, mergedArgs)
			return fillUnserializableFlytrapValues(replayOutput, realOutput)
		}
		// We're capturing
		const output = executeFunctionCall(fnOrNamespace, opts.name, opts.args)
		saveOutputForFunctionCall(opts.id, output)

		return output
	} catch (error) {
		/**
		 * Oops! We found a bug, let's send the current
		 * executing function along with its data to the
		 * Flytrap API.
		 */
		saveErrorForFunctionCall(opts.id, error as Error)
		log.info('capture', `Captured error in function call with ID "${opts.id}".`, { error })
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
				return await executeFunctionCallAsync(fn, opts.name, opts.args)
			}

			// Merge replay args & real args
			const mergedArgs = fillUnserializableFlytrapValues(replayArgs, opts.args)
			const realOutput = await executeFunctionCallAsync(fn, opts.name, mergedArgs)
			return fillUnserializableFlytrapValues(replayOutput, realOutput)
		}
		// We're capturing
		// const output = await fn(...opts.args)
		const output = await executeFunctionCallAsync(fn, opts.name, opts.args)
		saveOutputForFunctionCall(opts.id, output)

		return output
	} catch (error) {
		/**
		 * Oops! We found a bug, let's send the current
		 * executing function along with its data to the
		 * Flytrap API.
		 */
		saveErrorForFunctionCall(opts.id, error)
		log.info('capture', `Captured error in async function call with ID "${opts.id}".`, { error })
		throw error
	}
}

function getReplayCallArgs(functionCallId: string): any[] | undefined {
	const loadedCapture = getLoadedCapture()
	if (!loadedCapture) {
		loadCapture()
		return undefined
	}

	const matchingCall = loadedCapture.calls.find((f) => f.id === functionCallId)
	return matchingCall?.invocations.sort((a, b) => a.timestamp - b.timestamp).at(-1)?.args
}

function getReplayCallOutput(functionCallId: string): any | undefined {
	const loadedCapture = getLoadedCapture()
	if (!loadedCapture) {
		loadCapture()
		return undefined
	}

	const matchingCall = loadedCapture.calls.find((f) => f.id === functionCallId)
	return matchingCall?.invocations.sort((a, b) => a.timestamp - b.timestamp).at(-1)?.output
}

function getReplayFunctionArgs(functionId: string): any[] | undefined {
	const loadedCapture = getLoadedCapture()
	if (!loadedCapture) {
		loadCapture()
		return undefined
	}

	const matchingFunction = loadedCapture.functions.find((f) => f.id === functionId)
	return matchingFunction?.invocations.sort((a, b) => a.timestamp - b.timestamp).at(-1)?.args
}

function getReplayFunctionOutput(functionId: string): any | undefined {
	const loadedCapture = getLoadedCapture()
	if (!loadedCapture) {
		loadCapture()
		return undefined
	}

	const matchingFunction = loadedCapture.functions.find((f) => f.id === functionId)
	return matchingFunction?.invocations.sort((a, b) => a.timestamp - b.timestamp).at(-1)?.output
}

let _executingFunctions: CapturedFunction[] = []
let _functionCalls: CapturedCall[] = []
let _userId: string | undefined = undefined

export const getCapturedFunctions = () => _executingFunctions
export const getCapturedCalls = () => _functionCalls

export const clearCapturedFunctions = () => {
	_executingFunctions = []
}

export const clearCapturedCalls = () => {
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

export async function capture<T extends Error>({
	error,
	message
}: {
	error: T
	message?: string
}): Promise<void> {
	log.info('capture', `Manually captured error.`, { error, ...(message && { message }) })
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
		console.error(saveError)
	}
}

export function identify(userId: string) {
	log.info('identify', `Identified current user as "${userId}"`)
	_userId = userId
}
export const getUserId = () => _userId
export const getExecutingFunction = () => _executingFunctions.at(-1)

const addFunctionInvocation = (functionId: string, invocation: CaptureInvocation) => {
	log.info('function-execution', `Executing function with ID "${functionId}"`)
	const matchingExecutingFunction = _executingFunctions.find((execFn) => execFn.id === functionId)
	if (matchingExecutingFunction) {
		matchingExecutingFunction.invocations.push(invocation)
		return
	}

	_executingFunctions.push({
		id: functionId,
		invocations: [invocation]
	})
}

function saveFunctionCall(opts: FlytrapCallOptions) {
	const matchingFunctionCall = _functionCalls.find((call) => call.id === opts.id)
	if (matchingFunctionCall) {
		matchingFunctionCall.invocations.push({
			...opts,
			timestamp: Date.now()
		})
		return
	}

	_functionCalls.push({
		id: opts.id,
		invocations: [
			{
				...opts,
				timestamp: Date.now()
			}
		]
	})
}

function saveOutputForFunctionCall<T>(functionCallId: string, output: T) {
	// @ts-ignore for some reason this isn't included
	const functionCallIndex = _functionCalls.findLastIndex((call) => call.id === functionCallId)

	if (functionCallIndex === -1) {
		console.error(`Saving output for nonexistent function call with ID ${functionCallId}`)
		return
	}

	const lastInvocation = _functionCalls[functionCallIndex].invocations.at(-1)
	if (lastInvocation) lastInvocation.output = output
}

function saveOutputForFunction<T>(functionId: string, output: T) {
	// @ts-ignore for some reason this isn't included
	const functionIndex = _executingFunctions.findLastIndex((func) => func.id === functionId)

	if (functionIndex === -1) {
		console.error(`Saving output for nonexistent function with ID ${functionId}`)
		return
	}

	const lastInvocation = _executingFunctions[functionIndex].invocations.at(-1)
	if (lastInvocation) lastInvocation.output = output
}

function getFunctionCallById(functionCallId: string) {
	return _functionCalls.find((call) => call.id === functionCallId)
}

function getFunctionById(functionId: string) {
	return _executingFunctions.find((func) => func.id === functionId)
}

// TODO: let's make overloaded calls like this for `capture`
// function saveErrorForFunctionCall(functionCallId: string, error: string): void;
function saveErrorForFunctionCall(functionCallId: string, error: any): void {
	const call = getFunctionCallById(functionCallId)

	if (!call) {
		console.error(`Saving error for nonexistent function call with ID ${functionCallId}`)
		return
	}
	log.info('call-execution', `Saving error for function call ID ${functionCallId}.`, { error })
	const lastInvocation = call.invocations.at(-1)
	if (lastInvocation) lastInvocation.error = serializeError(error)
}

function saveErrorForFunction(functionId: string, error: any) {
	const func = getFunctionById(functionId)

	if (!func) {
		console.error(`Saving error for nonexistent function with ID ${functionId}`)
		return
	}

	log.info('function-execution', `Saving error for function ID ${functionId}`, { error })
	const lastInvocation = func.invocations.at(-1)
	if (lastInvocation) lastInvocation.error = serializeError(error)
}

// Export
export * from './core/config'
export * from './core/types'
export * from './core/encryption'
export * from './core/stringify'
