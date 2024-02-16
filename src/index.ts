import { serializeError } from 'serialize-error'
import {
	AnyFunction,
	CaptureInvocation,
	CapturedCall,
	CapturedFunction,
	FlytrapCallOptions
} from './core/types'
import {
	TryCatchResponse,
	errorTelemetry,
	fillUnserializableFlytrapValues,
	findLastInvocationById,
	getMode
} from './core/util'
import { log } from './core/logging'
import { saveCapture } from './core/storage'
import { getCapture } from './core/noop'

let _executingFunctions: CapturedFunction[] = []
let _executionCursor = 1
let _functionCalls: CapturedCall[] = []
let _userId: string | undefined = undefined

export const getCapturedFunctions = () => _executingFunctions
export const getCapturedCalls = () => _functionCalls

export const getUserId = () => _userId
export const getExecutingFunction = () =>
	_executingFunctions.at(-_executionCursor) ?? _executingFunctions.at(-1)

export const clearCapturedFunctions = () => {
	_executingFunctions = []
}

export const clearCapturedCalls = () => {
	_functionCalls = []
}

// Function & call wrappers
export type UfcReturnType<T, O extends FlytrapCallOptions> = T extends AnyFunction
	? ReturnType<T>
	: T extends object
		? // @ts-expect-error
			ReturnType<T[O['name']]>
		: never

export function ufc<T, O extends FlytrapCallOptions>(
	functionOrNamespace: T,
	opts: O
): UfcReturnType<T, O> {
	try {
		saveFunctionCall(opts)

		const execFunctionCall = <T>(fn: T, name: string, args: any[]) => {
			// Needs to be wrapped with `String` to prevent Symbol's from throwing
			log.info('call-execution', `Executing function ${String(name)}()`, { args })
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

		if (getMode() === 'replay') {
			const currentLoadedCaptureResult = getCapture()
			if (currentLoadedCaptureResult.err) {
				log.error('error', currentLoadedCaptureResult.val.toString())
				return execFunctionCall(functionOrNamespace, opts.name, opts.args)
			}

			// @ts-expect-error: because of NO-OP
			const lastInvocation = findLastInvocationById(opts.id, currentLoadedCaptureResult.val)

			if (!lastInvocation) {
				return execFunctionCall(functionOrNamespace, opts.name, opts.args)
			}

			const replayArgs = lastInvocation.args
			const replayOutput = lastInvocation.output

			// Merge replay & real args
			const mergedArgs = fillUnserializableFlytrapValues(replayArgs, opts.args)
			const realOutput = execFunctionCall(functionOrNamespace, opts.name, mergedArgs)
			return fillUnserializableFlytrapValues(replayOutput, realOutput)
		}

		const output = execFunctionCall(functionOrNamespace, opts.name, opts.args)
		if (output instanceof Promise) {
			output.catch((error) => {
				/**
				 * Oops! We found a bug, let's send the current
				 * executing function along with its data to the
				 * Flytrap API.
				 */
				saveErrorForFunctionCall(opts.id, error)
				log.info('capture', `Captured error in async function call with ID "${opts.id}".`, {
					error
				})
			})
		}
		saveOutputForFunctionCall(opts.id, output)
		return output
	} catch (error) {
		/**
		 * Oops! We found a bug, let's send the current
		 * executing function along with its data to the
		 * Flytrap API.
		 */
		saveErrorForFunctionCall(opts.id, error)
		log.info('capture', `Captured error in function call with ID "${opts.id}".`, { error })
		throw error
	}
}

export function uff<T extends AnyFunction>(func: T, id: string | null = null): T {
	return function (this: any, ...args: any[]) {
		if (id) {
			addFunctionInvocation(id, {
				args,
				timestamp: Date.now()
			})
		}
		_executionCursor--

		if (getMode() === 'replay' && id) {
			const currentLoadedCaptureResult = getCapture()
			if (currentLoadedCaptureResult.err) {
				log.error('error', currentLoadedCaptureResult.val.toString())
				return func.apply(this, args)
			}

			// @ts-expect-error: because of NO-OP
			const lastInvocation = findLastInvocationById(id, currentLoadedCaptureResult.val)

			if (!lastInvocation) {
				return func.apply(this, args)
			}

			// Merge replay args & real args
			const replayArgs = lastInvocation.args
			const mergedArgs = fillUnserializableFlytrapValues(replayArgs, args)
			return func.apply(this, mergedArgs)
		}

		try {
			const functionOutput = func.apply(this, args)
			if (functionOutput instanceof Promise) {
				functionOutput.catch((error) => {
					/**
					 * Oops! We found a bug, let's send the current
					 * executing function along with its data to the
					 * Flytrap API.
					 */
					sendCaptureToApi(id, error, true)
				})
			}
			if (id) {
				saveOutputForFunction(id, functionOutput)
			}
			_executionCursor++
			return functionOutput
		} catch (error) {
			/**
			 * Oops! We found a bug, let's send the current
			 * executing function along with its data to the
			 * Flytrap API.
			 */
			sendCaptureToApi(id, error)

			throw error
		}
	} as T
}

export function sendCaptureToApi(id: string | null, error: unknown, async = false) {
	if (id) {
		saveErrorForFunction(id, error)
		log.info('capture', `Captured error in ${async ? 'async' : 'sync'} function with ID "${id}".`, {
			error
		})

		saveCapture(_executingFunctions, _functionCalls, error)
			.then(async (saveResult) => {
				// Show user facing error here
				if (saveResult?.err) {
					const humanErrorLog = saveResult.val
					// @ts-expect-error
					humanErrorLog.addEvents(['capture_failed'])
					// @ts-expect-error
					humanErrorLog.addSolutions(['try_again_contact_us'])
					log.error('error', humanErrorLog.toString())
					await errorTelemetry(humanErrorLog.toString())
				}
			})
			.catch(async (saveError) => {
				log.error('error', saveError)
				await errorTelemetry(String(saveError))
			})
	}
}

export async function capture(error: any): Promise<void> {
	log.info('capture', `Manually captured error.`, { error })
	/**
	 * We're manually capturing an error. Let's send the current
	 * executing function along with its data to the Flytrap API.
	 */
	const executingFunction = getExecutingFunction()
	if (executingFunction) {
		saveErrorForFunction(executingFunction.id, error)
	}

	// Let's save it
	const saveResult = await saveCapture(_executingFunctions, _functionCalls, error)
	if (saveResult.err) {
		const errorLog = saveResult.val
		// @ts-expect-error
		errorLog.addEvents(['capture_failed'])
		// @ts-expect-error
		errorLog.addSolutions(['try_again_contact_us'])
		log.error('error', errorLog.toString())
		await errorTelemetry(errorLog.toString())
	}
}

export function identify(userId: string) {
	log.info('identify', `Identified current user as "${userId}"`)
	_userId = userId
}

const addFunctionInvocation = (functionId: string, invocation: CaptureInvocation) => {
	log.info('function-execution', `Executing function with ID "${functionId}"`)
	// const matchingExecutingFunction = _executingFunctions.find((execFn) => execFn.id === functionId)
	const matchingExecutingFunction = getFunctionById(functionId)
	if (matchingExecutingFunction) {
		matchingExecutingFunction.invocations.push(invocation)

		// Only keep 10 latest invocations
		while (matchingExecutingFunction.invocations.length > 10) {
			matchingExecutingFunction.invocations.shift()
		}
		return
	}

	_executingFunctions.push({
		id: functionId,
		invocations: [invocation]
	})
}

function saveFunctionCall(opts: FlytrapCallOptions) {
	// const matchingFunctionCall = _functionCalls.find((call) => call.id === opts.id)
	const matchingFunctionCall = getFunctionCallById(opts.id)
	if (matchingFunctionCall) {
		// Limit invocations
		matchingFunctionCall.invocations.push({
			...opts,
			timestamp: Date.now()
		})

		// Only keep 10 latest invocations
		while (matchingFunctionCall.invocations.length > 10) {
			matchingFunctionCall.invocations.shift()
		}

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
	// const functionCallIndex = _functionCalls.findLastIndex((call) => call.id === functionCallId)
	const functionCall = getFunctionCallById(functionCallId)

	// console.log("function calls invocations length", _functionCalls.reduce((acc, curr) => acc + curr.invocations.length, 0))

	if (functionCall === undefined) {
		log.error('error', `Saving output for nonexistent function call with ID "${functionCallId}"`)
		return
	}

	/* if (functionCallIndex === -1) {
		log.error('error', `Saving output for nonexistent function call with ID "${functionCallId}"`)
		return
	} */

	const lastInvocation = functionCall.invocations.at(-1)
	if (lastInvocation) lastInvocation.output = output
}

function saveOutputForFunction<T>(functionId: string, output: T) {
	// @ts-ignore for some reason this isn't included
	// const functionIndex = _executingFunctions.findLastIndex((func) => func.id === functionId)
	const functionDef = getFunctionById(functionId)

	if (functionDef === undefined) {
		log.error('error', `Saving output for nonexistent function with ID "${functionId}"`)
		return
	}

	/* if (functionIndex === -1) {
		log.error('error', `Saving output for nonexistent function with ID "${functionId}"`)
		return
	} */

	// console.log("functions invocations length", _executingFunctions.reduce((acc, curr) => acc + curr.invocations.length, 0))

	// const lastInvocation = _executingFunctions[functionIndex].invocations.at(-1)
	const lastInvocation = functionDef.invocations.at(-1)
	if (lastInvocation) lastInvocation.output = output
}

function getFunctionCallById(functionCallId: string) {
	for (let i = 0; i < _functionCalls.length; i++) {
		if (_functionCalls[i].id === functionCallId) {
			return _functionCalls[i]
		}
	}
	return undefined
	// return _functionCalls.find((call) => call.id === functionCallId)
}

function getFunctionById(functionId: string) {
	for (let i = 0; i < _executingFunctions.length; i++) {
		if (_executingFunctions[i].id === functionId) {
			return _executingFunctions[i]
		}
	}

	return undefined
	// return _executingFunctions.find((func) => func.id === functionId)
}

// TODO: let's make overloaded calls like this for `capture`
// function saveErrorForFunctionCall(functionCallId: string, error: string): void;
function saveErrorForFunctionCall(functionCallId: string, error: any): void {
	const call = getFunctionCallById(functionCallId)

	if (!call) {
		log.error('error', `Saving error for nonexistent function call with ID ${functionCallId}`)
		return
	}
	log.info('call-execution', `Saving error for function call ID ${functionCallId}.`, { error })
	const lastInvocation = call.invocations.at(-1)
	if (lastInvocation) lastInvocation.error = serializeError(error)
}

function saveErrorForFunction(functionId: string, error: any) {
	const func = getFunctionById(functionId)

	if (!func) {
		log.error('error', `Saving error for nonexistent function with ID ${functionId}`)
		return
	}

	log.info('function-execution', `Saving error for function ID ${functionId}`, { error })
	const lastInvocation = func.invocations.at(-1)
	if (lastInvocation) lastInvocation.error = serializeError(error)
}

// Utility functions
export async function tryCapture<DType = unknown, EType = any>(
	fn: Promise<DType>
): Promise<TryCatchResponse<DType, EType>> {
	try {
		return { data: await fn, error: null }
	} catch (error) {
		await capture(error)
		return { data: null, error: error as EType }
	}
}
export function tryCaptureSync<DType = unknown, EType = any>(
	fn: () => DType
): TryCatchResponse<DType, EType> {
	try {
		return { data: fn(), error: null }
	} catch (error) {
		capture(error)
		return { data: null, error: error as EType }
	}
}

export async function invariantAsync(condition: any, message?: string) {
	if (condition) return
	await capture(new Error(`Invariant failed.${message ? ` ${message}` : ''}`))
	throw new Error(`Invariant failed${message ? `: ${message}` : ''}`)
}
export function invariant(condition: any, message?: string): asserts condition {
	if (condition) return
	capture(new Error(`Invariant failed.${message ? ` ${message}` : ''}`))
	throw new Error(`Invariant failed${message ? `: ${message}` : ''}`)
}

// Export
export * from './core/config'
export * from './core/types'
export * from './core/encryption'
export * from './core/stringify'
