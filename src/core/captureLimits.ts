import { Err, Ok } from 'ts-results'
import { CaptureAmountLimit, CaptureInvocation, CapturedCall, CapturedFunction } from './types'
import {
	parseCaptureAmountLimit,
	parseFilepathFromFunctionId,
	sortCapturesByTimestamp
} from './util'
import { getCaptureSize } from './stringify'

export function getSizeLimitedCaptures<T extends CapturedCall | CapturedFunction>(
	callsOrFunctions: T[],
	sizeLimitBytes: number
) {
	let currentSize = 0
	let result: T[] = []

	const callsOrFunctionsClone = callsOrFunctions.map((callOrFunc) => ({
		id: callOrFunc.id,
		invocations: [...callOrFunc.invocations]
	}))

	for (let i = 0; i < callsOrFunctions.length; i++) {
		result.push({ id: callsOrFunctions[i].id, invocations: [] as T['invocations'] } as T)
	}

	let addedThisRound = false
	do {
		addedThisRound = false // Reset for the current round

		for (let i = 0; i < callsOrFunctionsClone.length; i++) {
			const call = callsOrFunctionsClone[i]
			if (call.invocations.length > 0) {
				// Instead of popping the last, we take the newest invocation directly
				const invocation = call.invocations[call.invocations.length - 1] // Access the newest invocation
				const invocationSize = getCaptureSize(invocation as any).unwrapOr(0)

				if (currentSize + invocationSize <= sizeLimitBytes) {
					// Insert the invocation in the correct order (newest first)
					result[i].invocations.unshift(invocation) // Add the invocation to the beginning
					call.invocations.pop() // Remove the newest invocation from the clone
					currentSize += invocationSize
					addedThisRound = true
				}
			}
		}
	} while (addedThisRound && currentSize < sizeLimitBytes)

	// Filter out calls without invocations
	result = result.filter((callOrFunc) => callOrFunc.invocations.length > 0)

	const resultCalls: CapturedCall[] = []
	const resultFunctions: CapturedFunction[] = []

	for (let i = 0; i < result.length; i++) {
		if (result[i].id.includes('-call-_')) {
			resultCalls.push(result[i])
		} else {
			resultFunctions.push(result[i])
		}
	}

	return Ok({
		calls: resultCalls,
		functions: resultFunctions
	})
}

export function getLimitedCaptures(
	calls: CapturedCall[],
	functions: CapturedFunction[],
	limit: CaptureAmountLimit
) {
	const parsedCaptureAmountLimit = parseCaptureAmountLimit(limit)

	// Return the Error result
	if (parsedCaptureAmountLimit.err) {
		return parsedCaptureAmountLimit
	}

	const combinedFunctionsAndCalls = [...functions, ...calls]
	const sortedCombined = sortCapturesByTimestamp(combinedFunctionsAndCalls)

	// Handle file limits
	if (parsedCaptureAmountLimit.val.type === 'files') {
		const capturedFilenames = new Set<string>()
		for (let i = 0; i < sortedCombined.length; i++) {
			const currentFunctionOrCall = sortedCombined.at(-(i + 1))
			if (!currentFunctionOrCall) {
				return Err(`Current function or call not found.`)
			}

			const filepath = parseFilepathFromFunctionId(currentFunctionOrCall.id).unwrap()
			capturedFilenames.add(filepath)
			if (capturedFilenames.size >= parsedCaptureAmountLimit.val.fileLimit) {
				break
			}
		}

		// Use the filepaths of N latest to filter calls and functions
		calls = calls.filter((call) => {
			const parsedFilepath = parseFilepathFromFunctionId(call.id).unwrap()
			if (capturedFilenames.has(parsedFilepath)) {
				return true
			}
			return false
		})

		functions = functions.filter((func) => {
			const parsedFilepath = parseFilepathFromFunctionId(func.id).unwrap()
			if (capturedFilenames.has(parsedFilepath)) {
				return true
			}
			return false
		})

		return Ok({ calls, functions })
	}

	// Handle byte limits
	return getSizeLimitedCaptures(sortedCombined, parsedCaptureAmountLimit.val.sizeLimit)
}
