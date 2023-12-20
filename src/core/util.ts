import { Err, Ok, Result } from 'ts-results'
import { getApiBase, getLoadedConfig } from './config'
import { FLYTRAP_REPLACE_VALUES, FLYTRAP_UNSERIALIZABLE_VALUE } from './constants'
import {
	CaptureAmountLimit,
	CaptureAmountLimitType,
	CaptureDecryptedAndRevived,
	CapturedCall,
	CapturedFunction,
	FlytrapMode
} from './types'

export function empty<T>(...args: T[]): boolean {
	return args.some((item) => item === undefined || item === null || item === '')
}

export function isAsyncFunction(fn: any) {
	return Object.getPrototypeOf(fn).constructor.name === 'AsyncFunction'
}

export function isSameArgs(args1: any, args2: any) {
	return JSON.stringify(args1) === JSON.stringify(args2)
}

export function getMode(): FlytrapMode {
	if (getLoadedConfig()) return getLoadedConfig()?.mode ?? 'capture'
	return 'capture'
}

export function deriveAnonymousFunctionName(scopes: string[], usedFunctionNames: string[]) {
	let counter = 1
	const getDerivedName = (scopes: string[]) =>
		`${scopes.join('-')}${scopes.length > 0 ? '/' : ''}anonymous-${counter}`
	let derivedName = getDerivedName(scopes)

	while (usedFunctionNames.includes(getDerivedName(scopes))) {
		counter++
		derivedName = getDerivedName(scopes)
	}
	return derivedName
}

/*
  Replacer function to JSON.stringify that ignores
  circular references and internal React properties.
  https://github.com/facebook/react/issues/8669#issuecomment-531515508
*/
export function ignoreCircularReferences() {
	const seen = new WeakSet()
	return (key: any, value: any) => {
		if (key.startsWith('_')) return // Don't compare React's internal props.
		if (typeof value === 'object' && value !== null) {
			if (seen.has(value)) return FLYTRAP_UNSERIALIZABLE_VALUE
			seen.add(value)
		}
		return value
	}
}

export type TryCatchResponse<DType, EType> =
	| {
			data: DType
			error: null
	  }
	| {
			data: null
			error: EType
	  }

export async function tryCatch<DType = unknown, EType = unknown>(
	fn: Promise<DType>
): Promise<TryCatchResponse<DType, EType>> {
	try {
		return { data: await fn, error: null }
	} catch (error) {
		return { data: null, error: error as EType }
	}
}
export function tryCatchSync<DType = unknown, EType = unknown>(
	fn: () => DType
): TryCatchResponse<DType, EType> {
	try {
		return { data: fn(), error: null }
	} catch (error) {
		return { data: null, error: error as EType }
	}
}

type ReplaceValue = any
type InputValue = ReplaceValue | (typeof FLYTRAP_REPLACE_VALUES)[number]

export function fillUnserializableFlytrapValues(
	input: InputValue,
	replaceValue: ReplaceValue
): ReplaceValue {
	if (FLYTRAP_REPLACE_VALUES.includes(input)) {
		if (replaceValue === undefined) throw new Error(`Replace value is undefined.`)
		return replaceValue
	}

	if (input === null || input === undefined) {
		return replaceValue
	}

	if (Array.isArray(input)) {
		return input.map((value, index) => {
			return fillUnserializableFlytrapValues(value, replaceValue[index])
		})
	}

	if (typeof input === 'object') {
		if (typeof replaceValue !== 'object') {
			throw new Error('Input value is an object but replace value is not an object.')
		}
		const output = { ...input }

		for (const key in output) {
			if (Object.prototype.hasOwnProperty.call(output, key)) {
				output[key] = fillUnserializableFlytrapValues(output[key], replaceValue[key])
			}
		}

		return output
	}
	return input
}

export const formatBytes = (bytes: number) => {
	if (bytes === 0) return '0 B'
	const e = Math.floor(Math.log(bytes) / Math.log(1000))
	return `${(bytes / Math.pow(1000, e)).toFixed(2)} ${' KMGTP'.charAt(e)}B`
}

export function normalizeFilepath(pkgDirPath: string, filePath: string) {
	return filePath.replace(pkgDirPath, '').replace(/\0/g, '')
}

export function ok<T>(data: T) {
	return {
		data,
		error: null
	}
}

export function err<T>(error: T) {
	return {
		data: null,
		error
	}
}

export const extname = (filePath: string) => '.' + filePath.split('.').at(-1)

export function parseFileCount(input: CaptureAmountLimit) {
	// Regular expression to match a number at the start of the string
	const regex = /^\d+\s*files$/

	// Extract the number using the regex
	const match = input.trim().match(regex)

	// Throw an error if no number is found
	if (!match) {
		return Err(`No number found in string "${input}". Valid format is "4 files".`)
	}

	// Parse the number
	const fileCount = parseInt(match[0])

	return Ok({
		type: 'files',
		fileLimit: fileCount
	} satisfies CaptureAmountLimitType)
}

export function parseByteStringToBytes(byteString: CaptureAmountLimit) {
	const units = new Map<string, number>([
		['b', 1],
		['kb', 1000],
		['mb', 1000 ** 2]
	])

	const regex = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb)$/i
	const match = byteString.match(regex)

	if (!match) {
		return Err(`Invalid byte string format "${byteString}". Expected value like "4mb", "128kb".`)
	}

	const value = parseFloat(match[1])
	const unit = match[2].toLowerCase()

	const factor = units.get(unit)
	if (!factor) {
		return Err(`Invalid unit "${unit}". Accepted units are "b", "kb" and "mb".`)
	}

	return Ok({
		type: 'size',
		sizeLimit: value * factor
	} satisfies CaptureAmountLimitType)
}

export function parseCaptureAmountLimit(captureAmountLimit: CaptureAmountLimit) {
	const parsingResult = Result.any(
		parseByteStringToBytes(captureAmountLimit),
		parseFileCount(captureAmountLimit)
	)

	if (parsingResult.ok) {
		// Check that fileCount > 0 & size > 0
		if (parsingResult.val.type === 'files' && parsingResult.val.fileLimit === 0) {
			return Err(
				`Invalid capture amount limit "${captureAmountLimit}". Number of files to capture must be greater than 0.`
			)
		}

		if (parsingResult.val.type === 'size' && parsingResult.val.sizeLimit < 128) {
			return Err(
				`Invalid capture amount limit "${captureAmountLimit}". The minimum size to capture is 128 bytes.`
			)
		}
	}

	return parsingResult.mapErr(
		() =>
			`Invalid capture amount limit "${captureAmountLimit}". Valid values are file-based capture limits (eg. '3 files') or file-size based capture limits (eg. '2mb')`
	)
}

export function sortCapturesByTimestamp(captures: (CapturedFunction | CapturedCall)[]) {
	return captures.sort((a, b) => {
		// Find the maximum timestamp in the invocations of a
		const maxTimestampA = Math.max(...a.invocations.map((invoc) => invoc.timestamp))
		// Find the maximum timestamp in the invocations of b
		const maxTimestampB = Math.max(...b.invocations.map((invoc) => invoc.timestamp))
		// Sort based on the maximum timestamps
		return maxTimestampA - maxTimestampB
	})
}

export function parseFilepathFromFunctionId(id: string) {
	// Find the index of "-_" or "-call-_"
	const callIndex = id.indexOf('-call-_')
	const dashIndex = id.indexOf('-_')

	// Determine the end index for the file path
	const endIndex = callIndex !== -1 ? callIndex : dashIndex

	// If neither pattern is found, return an error
	if (endIndex === -1) {
		return Err(`Invalid function ID "${id}".`)
	}

	// Extract and return the file path
	return Ok(id.substring(0, endIndex))
}

export function findLastInvocationById(
	functionOrCallId: string,
	capture: CaptureDecryptedAndRevived
) {
	const matchingFunction = capture.functions.find((f) => f.id === functionOrCallId)
	const matchingCall = capture.calls.find((c) => c.id === functionOrCallId)
	if (matchingFunction) {
		return matchingFunction.invocations.sort((a, b) => a.timestamp - b.timestamp).at(-1)
	} else if (matchingCall) {
		return matchingCall.invocations.sort((a, b) => a.timestamp - b.timestamp).at(-1)
	}
}

export async function errorTelemetry(message: string) {
	try {
		await fetch(`${getApiBase()}/api/telemetry`, {
			method: 'POST',
			body: JSON.stringify({
				m: message,
				p: getLoadedConfig()?.projectId
			})
		})
	} catch {
		// nothing
	}
}
