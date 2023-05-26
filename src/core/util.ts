// import { getFlytrapConfig, getLoadedConfig } from './config'
import { getLoadedConfig } from './config'
import { FLYTRAP_UNSERIALIZABLE_VALUE } from './constants'
import { SourceType } from './types'

/**
 * Get the caller source file name and line number
 * @returns
 */
export function extractCallerSource(): SourceType | undefined {
	const stack = new Error().stack
	if (!stack) return undefined

	const lines = stack.split('\n')
	// Third line contains our called file and line
	// /Users/rasmus/Desktop/DEV/Web/flytrap-libs/test/newindex.test.ts:13:24
	if (lines.length < 4) return undefined
	const sourceLine = lines[3]
	const parts = sourceLine.split('/')
	const fileNameAndSourceLine = parts[parts.length - 1]
	// newindex.test.ts:13:24
	const [filePath, lineNumber] = fileNameAndSourceLine.split(':')
	return {
		filePath,
		lineNumber: parseInt(lineNumber)
	}
}

export type RequestResponse<DataType, ErrorType> =
	| {
			data: DataType
			error: null
	  }
	| {
			data: null
			error: ErrorType
	  }

export async function request<DataType = unknown, ErrorType = string>(
	endpoint: string,
	method: 'post' | 'get' | 'put' | 'delete',
	body?: BodyInit,
	options: RequestInit = {}
): Promise<RequestResponse<DataType, ErrorType>> {
	try {
		const data = await fetch(endpoint, {
			...options,
			method,
			headers: {
				accept: 'application/json',
				'content-type': 'application/json'
			},
			...(options.headers && { headers: options.headers }),
			body
		})
		if (data.status >= 400 && data.status < 600) throw await data.text()
		return { data: await data.json(), error: null }
	} catch (error) {
		return { data: null, error: error as ErrorType }
	}
}

export async function post<DataType = unknown, ErrorType = string>(
	endpoint: string,
	body: BodyInit,
	options: RequestInit = {}
) {
	return request<DataType, ErrorType>(endpoint, 'post', body, options)
}

export async function del<DataType = unknown, ErrorType = string>(
	endpoint: string,
	body: BodyInit,
	options: RequestInit = {}
) {
	return request<DataType, ErrorType>(endpoint, 'delete', body, options)
}

export async function put<DataType = unknown, ErrorType = string>(
	endpoint: string,
	body: BodyInit,
	options: RequestInit = {}
) {
	return request<DataType, ErrorType>(endpoint, 'put', body, options)
}

export async function get<DataType = unknown, ErrorType = string>(
	endpoint: string,
	body?: URLSearchParams,
	options: RequestInit = {}
) {
	return request<DataType, ErrorType>(
		`${endpoint}${body ? `?${body.toString()}` : ''}`,
		'get',
		undefined,
		options
	)
}

export function empty<T>(...args: T[]): boolean {
	return args.some((item) => item === undefined || item === null || item === '')
}

export function isAsyncFunction(fn: any) {
	return Object.getPrototypeOf(fn).constructor.name === 'AsyncFunction'
}

export function isSameArgs(args1: any, args2: any) {
	return JSON.stringify(args1) === JSON.stringify(args2)
}

export function getMode(): 'replay' | 'capture' {
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

// function fillMissingFlytrapValues(lackingObject: any, fullObject: any) {}

type ReplaceValue = any
type InputValue = ReplaceValue | typeof FLYTRAP_UNSERIALIZABLE_VALUE

export function fillUnserializableFlytrapValues(
	input: InputValue,
	replaceValue: ReplaceValue
): ReplaceValue {
	if (input === FLYTRAP_UNSERIALIZABLE_VALUE) {
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
