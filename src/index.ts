import { serializeError } from 'serialize-error'
import {
	CaptureDecrypted,
	CapturedCall,
	CapturedFunction,
	FlytrapCallOptions,
	FlytrapFunctionOptions,
	SourceType
} from './core/types'
import {
	extractCallerSource,
	fillUnserializableFlytrapValues,
	getMode,
	isAsyncFunction,
	tryCatch,
	tryCatchSync
} from './core/util'
import { getFlytrapStorage } from './core/storage'
import { createHumanLog } from './core/human-logs'
import { NO_SOURCE } from './core/constants'

/**
 * All function definitions are wrapped with the useFlytrapFunction
 */
export function useFlytrapFunction<
	T extends ((...args: any) => Promise<any>) | ((...args: any) => any)
>(fn: T, opts: FlytrapFunctionOptions) {
	const functionName = opts.name ?? fn.name
	const source: SourceType =
		!opts?.filePath || !opts?.lineNumber
			? extractCallerSource() ?? NO_SOURCE
			: { filePath: opts.filePath, lineNumber: opts.lineNumber }
	if (source.lineNumber === -1) {
		console.error(
			`Failed to extract caller source. You should use useflytrap/transform to transform all your code, or pass in the correct file name and line number in all useFlytrapFunction() calls.`
		)
	}

	if (isAsyncFunction(fn)) {
		// Return async function
		return async (...args: any[]) => {
			addExecutingFunction({
				id: opts.id,
				name: functionName,
				args: [...args],
				source,
				scopes: opts.scopes,
				timestamp: Date.now()
			})

			// Replaying code
			if (getMode() === 'replay') {
				// const replayArgs = getInputArgsByFunctionId(opts.id, args)
				const replayArgs = getReplayFunctionArgs(opts.id)

				if (!replayArgs) {
					if (_loadedCapture) {
						console.warn(
							`Could not find replay input arguments for function with ID ${opts.id}, either this is a function you have added, or something has gone wrong during the capture process. If this is the case, contact us.`
						)
					}
					return await fn(...args)
				}

				// Merge replay args & real args
				const mergedArgs = fillUnserializableFlytrapValues(replayArgs, args)

				return await fn(...mergedArgs)
			}
			// Capturing bugs
			try {
				return await fn(...args)
			} catch (error) {
				/**
				 * Oops! We found a bug, let's send the current
				 * executing function along with its data to the
				 * Flytrap API.
				 */
				saveErrorForFunction(opts.id, error, source)

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
			name: functionName,
			args: [...args],
			source,
			scopes: opts.scopes,
			timestamp: Date.now()
		})

		// Replaying code
		if (getMode() === 'replay') {
			const replayArgs = getReplayFunctionArgs(opts.id)
			if (!replayArgs) {
				if (_loadedCapture) {
					console.warn(
						`Could not find replay input arguments for function with ID ${opts.id}, either this is a function you have added, or something has gone wrong during the capture process. If this is the case, contact us.`
					)
				}
				return fn(...args)
			}

			// Merge replay args & real args
			const mergedArgs = fillUnserializableFlytrapValues(replayArgs, args)
			return fn(...mergedArgs)
		}

		// We're capturing
		try {
			return fn(...args)
		} catch (error) {
			/**
			 * Oops! We found a bug, let's send the current
			 * executing function along with its data to the
			 * Flytrap API.
			 */
			saveErrorForFunction(opts.id, error, source)

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
	// @ts-ignore
	if (fn?.[name]) {
		if (typeof fn === 'object') {
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
	// @ts-ignore
	if (fn?.[name]) {
		if (typeof fn === 'object') {
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
	const source: SourceType =
		!opts?.filePath || !opts?.lineNumber
			? extractCallerSource() ?? NO_SOURCE
			: { filePath: opts.filePath, lineNumber: opts.lineNumber }
	if (source.lineNumber === -1) {
		console.error(
			`useFlytrapCall(): Failed to extract caller source. You should use useflytrap/transform to transform all your code, or pass in the correct file name and line number in all useFlytrapCall() calls.`
		)
	}

	try {
		// Save input
		saveFunctionCall(opts)

		// We're replaying
		if (getMode() === 'replay') {
			// const replayArgs = getInputArgsByFunctionCallId(opts.id)
			const replayArgs = getReplayCallArgs(opts.id)
			if (!replayArgs) {
				if (_loadedCapture) {
					console.warn(
						`Could not find replay input arguments for function call with ID ${opts.id}, either this is a new function call you have added, or something has gone wrong during the capture process. If this is the case, contact us.`
					)
				}
				// return fn(...opts.args)
				return executeFunction(fnOrNamespace, opts.name, opts.args)
			}

			// Merge args replay & real args
			const mergedArgs = fillUnserializableFlytrapValues(replayArgs, opts.args)

			return executeFunction(fnOrNamespace, opts.name, mergedArgs)
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
		saveErrorForFunctionCall(opts.id, error, source)

		throw error
	}
}

export async function useFlytrapCallAsync<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	opts: FlytrapCallOptions
) {
	const source: SourceType =
		!opts?.filePath || !opts?.lineNumber
			? extractCallerSource() ?? NO_SOURCE
			: { filePath: opts.filePath, lineNumber: opts.lineNumber }
	if (source.lineNumber === -1) {
		console.error(
			`useFlytrapCallAsync(): Failed to extract caller source. You should use useflytrap/transform to transform all your code, or pass in the correct file name and line number in all useFlytrapCallAsync() calls.`
		)
	}

	try {
		// Save input
		saveFunctionCall(opts)

		// We're replaying
		if (getMode() === 'replay') {
			const replayArgs = getReplayCallArgs(opts.id)
			if (!replayArgs) {
				if (_loadedCapture) {
					console.warn(
						`Could not find replay input arguments for function call with ID ${opts.id}, either this is a function call you have added, or something has gone wrong during the capture process. If this is the case, contact us.`
					)
				}
				//return await fn(...opts.args)
				return await executeFunctionAsync(fn, opts.name, opts.args)
			}

			// Merge replay args & real args
			const mergedArgs = fillUnserializableFlytrapValues(replayArgs, opts.args)
			// return await fn(...replayArgs)
			return await executeFunctionAsync(fn, opts.name, mergedArgs)
			// return await executeFunctionAsync(fn, opts.name, replayArgs)
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
		saveErrorForFunctionCall(opts.id, error, source)

		throw error
	}
}

function getReplayCallArgs(functionCallId: string): any[] | undefined {
	if (!_loadedCapture) {
		loadCapture()
		return undefined
	}

	const matchingFunctionCalls = _loadedCapture.calls.filter((call) => call.id === functionCallId)
	return matchingFunctionCalls[matchingFunctionCalls.length - 1]?.args ?? undefined
}

function getReplayFunctionArgs(functionId: string): any[] | undefined {
	if (!_loadedCapture) {
		loadCapture()
		return undefined
	}

	for (let i = 0; i < _loadedCapture.functions.length; i++) {
		if (_loadedCapture.functions[i].id === functionId) {
			return _loadedCapture.functions[i].args
		}
	}

	return undefined
}

let _loadedCapture: CaptureDecrypted | undefined = undefined
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
	const capture = await getFlytrapStorage().loadCapture()

	if (capture) {
		_loadedCapture = capture
		console.log('🐛 Flytrap - Replay data loaded!')
	}
}

export async function capture(error: any) {
	/**
	 * We're manually capturing an error. Let's send the current
	 * executing function along with its data to the Flytrap API.
	 */
	const executingFunction = getExecutingFunction()
	if (executingFunction) {
		saveErrorForFunction(executingFunction.id, error, executingFunction.source)
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
	_userId = userId
}
export const getUserId = () => _userId
export const getExecutingFunction = (): CapturedFunction | undefined =>
	_executingFunctions[_executingFunctions.length - 1]
const addExecutingFunction = (wrappedFunction: CapturedFunction) => {
	if (_executingFunctions.find((execFn) => execFn.id === wrappedFunction.id)) {
		return
	}
	_executingFunctions.push(wrappedFunction)
}

function saveFunctionCall(opts: FlytrapCallOptions) {
	const { filePath, lineNumber, ...restOpts } = opts
	_functionCalls.push({
		...restOpts,
		timestamp: Date.now(),
		source: {
			filePath,
			lineNumber
		}
	})
}

function saveOutputForFunctionCall<T>(functionCallId: string, output: T) {
	// @ts-ignore
	const functionCallIndex = _functionCalls.findLastIndex((call) => call.id === functionCallId)

	if (functionCallIndex === -1) {
		console.error(`Saving output for nonexistent function call with ID ${functionCallId}`)
		return
	}

	_functionCalls[functionCallIndex].output = output
}

function getFunctionCallById(functionCallId: string): CapturedCall | undefined {
	return _functionCalls.find((call) => call.id === functionCallId)
}

function getFunctionById(functionId: string): CapturedFunction | undefined {
	return _executingFunctions.find((func) => func.id === functionId)
}

function saveErrorForFunctionCall(functionCallId: string, error: any, source: SourceType) {
	const call = getFunctionCallById(functionCallId)

	if (!call) {
		console.error(`Saving error for nonexistent function call with ID ${functionCallId}`)
		return
	}
	call.error = {
		source: { ...source },
		...serializeError(error)
	}
}

function saveErrorForFunction(functionId: string, error: any, source: SourceType) {
	const func = getFunctionById(functionId)

	if (!func) {
		console.error(`Saving error for nonexistent function with ID ${functionId}`)
		return
	}

	func.error = {
		source,
		...serializeError(error)
	}
}

// Export
export * from './core/config'
export * from './core/types'
export * from './core/encryption'
