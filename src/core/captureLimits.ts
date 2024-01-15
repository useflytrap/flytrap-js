import { Err, Ok } from 'ts-results'
import { CaptureAmountLimit, CapturedCall, CapturedFunction } from './types'
import {
	parseCaptureAmountLimit,
	parseFilepathFromFunctionId,
	sortCapturesByTimestamp
} from './util'
import { getCaptureSize } from './stringify'

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

			const captureSize = getCaptureSize(callEntry)
			if (captureSize.err === false) {
				sizeCounter += captureSize.val
			}
		}
		if (functionEntry) {
			duplicateFunctions.push(functionEntry)

			const captureSize = getCaptureSize(functionEntry)

			if (captureSize.err === false) {
				sizeCounter += captureSize.val
			}
		}
	}

	return Ok({ calls: duplicateCalls, functions: duplicateFunctions })
}
