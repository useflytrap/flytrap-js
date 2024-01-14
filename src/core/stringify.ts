import {
	CaptureInvocation,
	CaptureInvocationWithLinks,
	CapturedCall,
	CapturedFunction
} from './types'
import SuperJSON, { parse, serialize, stringify } from 'superjson'
import { Err, Ok } from 'ts-results'
import { FLYTRAP_UNSERIALIZABLE_VALUE } from './constants'
import { createHumanLog } from './errors'
import { deepEqual } from 'fast-equals'

function _extract(captures: (CapturedCall | CapturedFunction)[], key: 'args' | 'output' = 'args') {
	const values = captures.reduce(
		(acc, curr) => [...acc, ...curr.invocations.map((i) => i[key])],
		[] as any[]
	)
	const seenValues: any[][] | any[] = []

	const existsInSeenValues = (value: any[] | any) => {
		return seenValues.find((searchValues) => deepEqual(value, searchValues)) !== undefined
	}

	for (let i = 0; i < values.length; i++) {
		if (!existsInSeenValues(values[i])) {
			seenValues.push(values[i])
		}
	}

	return seenValues
}

export function extractArgs(captures: (CapturedCall | CapturedFunction)[]): any[][] {
	return _extract(captures, 'args')
}

export function extractOutputs(captures: (CapturedCall | CapturedFunction)[]): any[] {
	return _extract(captures, 'output')
}

const _findIndexOfMatchingValue = (haystack: any[] | any[][], needle: any[] | any) => {
	for (let i = 0; i < haystack.length; i++) {
		if (deepEqual(haystack[i], needle)) {
			return i
		}
	}
	return undefined
}

export function addLinks(
	invocations: CaptureInvocation[],
	{ args, outputs }: { args: any[][]; outputs: any[] }
) {
	const invocationsWithLinks: CaptureInvocationWithLinks[] = []
	for (let i = 0; i < invocations.length; i++) {
		// Args
		const argsIndex = _findIndexOfMatchingValue(args, invocations[i].args)
		const outputIndex = _findIndexOfMatchingValue(outputs, invocations[i].output)

		if (argsIndex === undefined || outputIndex === undefined) {
			// @todo: improve error message
			throw new Error(`argsIndex undefined or outputIndex undefined.`)
		}

		invocationsWithLinks.push({
			...invocations[i],
			args: argsIndex,
			output: outputIndex
		})
	}
	return invocationsWithLinks
}

export function addLinksToCaptures(
	captures: (CapturedCall | CapturedFunction)[],
	{ args, outputs }: { args: any[][]; outputs: any[] }
) {
	const linkedCaptures: (
		| CapturedCall<CaptureInvocationWithLinks>
		| CapturedFunction<CaptureInvocationWithLinks>
	)[] = []
	for (let i = 0; i < captures.length; i++) {
		// captures[i].invocations
		const linkedInvocations = addLinks(captures[i].invocations, { args, outputs })
		linkedCaptures.push({
			...captures[i],
			invocations: linkedInvocations
		})
	}

	return linkedCaptures
}

export function reviveLinks(
	invocations: CaptureInvocationWithLinks[],
	{ args, outputs }: { args: any[][]; outputs: any[] }
): CaptureInvocation[] {
	for (let i = 0; i < invocations.length; i++) {
		// Revive args
		const argsIndex = invocations[i].args
		;(invocations[i] as unknown as CaptureInvocation).args = args[argsIndex]

		// Outputs
		const outputIndex = invocations[i].output
		invocations[i].output = outputs[outputIndex]
	}

	return invocations as unknown as CaptureInvocation[]
}

export function getCaptureSize(capture: CapturedCall | CapturedFunction) {
	return newSafeStringify(capture).map((stringifiedCapture) => stringifiedCapture.length)
}

export function removeCirculars(obj: any, parentObjects: Set<any> = new Set()): any {
	if (obj !== null && typeof obj === 'object') {
		if (parentObjects.has(obj)) {
			return FLYTRAP_UNSERIALIZABLE_VALUE
		}
		parentObjects.add(obj)

		for (const key of Object.keys(obj)) {
			obj[key] = removeCirculars(obj[key], new Set(parentObjects))
		}
	}
	return obj
}

const objectProtoNames = /* @__PURE__ */ Object.getOwnPropertyNames(Object.prototype)
	.sort()
	.join('\0')

function isPlainObject(thing: any) {
	const proto = Object.getPrototypeOf(thing)

	return (
		proto === Object.prototype ||
		proto === null ||
		Object.getOwnPropertyNames(proto).sort().join('\0') === objectProtoNames
	)
}

function isAllowedObject(obj: any): boolean {
	return (
		obj instanceof Date ||
		obj instanceof Map ||
		obj instanceof Set ||
		obj instanceof RegExp ||
		obj instanceof URL ||
		obj instanceof Error
	)
}

function isPrimitive(value: any): boolean {
	return value !== Object(value)
}

function removeNonPojos(obj: any): any {
	if (isPrimitive(obj) || isAllowedObject(obj)) {
		return obj // Allow all primitives and allowed object types.
	} else if (Array.isArray(obj)) {
		return obj.map(removeNonPojos)
	} else if (typeof obj === 'object') {
		// Check if the object is a POJO.
		if (isPlainObject(obj)) {
			const result: any = {}
			for (const key in obj) {
				result[key] = removeNonPojos(obj[key])
			}
			return result
		} else {
			return FLYTRAP_UNSERIALIZABLE_VALUE
		}
	} else {
		return FLYTRAP_UNSERIALIZABLE_VALUE
	}
}

export function removeCircularsAndNonPojos<T>(object: T): T {
	return removeNonPojos(removeCirculars(object))
}

function isSuperJsonSerializable(input: any) {
	try {
		stringify(input)
		return true
	} catch (e) {
		return false
	}
}

function isClassInstance<T>(obj: T): boolean {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		!(obj instanceof Array) &&
		obj.constructor &&
		obj.constructor !== Object
	)
}

export function superJsonRegisterCustom(superJsonInstance: typeof SuperJSON) {
	// Functions
	superJsonInstance.registerCustom<Function | string, string>(
		{
			isApplicable: (v): v is Function => typeof v === 'function',
			serialize: () => FLYTRAP_UNSERIALIZABLE_VALUE,
			deserialize: () => FLYTRAP_UNSERIALIZABLE_VALUE
		},
		'Functions'
	)

	// Unsupported classes
	superJsonInstance.registerCustom<any, string>(
		{
			isApplicable: (v): v is any => {
				const SUPPORTED_CLASSES = [Array, Date, RegExp, Set, Map, Error, URL]

				const isSupportedClass = SUPPORTED_CLASSES.some(
					(classInstance) => v instanceof classInstance
				)
				return isClassInstance(v) && !isSupportedClass
			},
			serialize: () => FLYTRAP_UNSERIALIZABLE_VALUE,
			deserialize: () => FLYTRAP_UNSERIALIZABLE_VALUE
		},
		'Classes'
	)
}

export function removeUnserializableValues(callsOrFunctions: (CapturedCall | CapturedFunction)[]) {
	for (let i = 0; i < callsOrFunctions.length; i++) {
		for (let j = 0; j < callsOrFunctions[i].invocations.length; j++) {
			const invocation = callsOrFunctions[i].invocations[j]
			// Args
			if (newSafeStringify(invocation.args).err) {
				invocation.args = invocation.args.map(() => FLYTRAP_UNSERIALIZABLE_VALUE)
			}

			// Output
			if (newSafeStringify(invocation.output).err) {
				invocation.output = FLYTRAP_UNSERIALIZABLE_VALUE
			}

			// Error
			if (newSafeStringify(invocation.error).err) {
				invocation.error = {
					name: FLYTRAP_UNSERIALIZABLE_VALUE,
					message: FLYTRAP_UNSERIALIZABLE_VALUE,
					stack: FLYTRAP_UNSERIALIZABLE_VALUE
				}
			}
		}
	}
	return callsOrFunctions
}

export function newSafeStringify<T>(object: T) {
	superJsonRegisterCustom(SuperJSON)

	try {
		return Ok(SuperJSON.stringify(object))
	} catch (e) {
		return Err(
			createHumanLog({
				explanations: ['stringify_object_failed'],
				params: {
					stringifyError: String(e)
				}
			})
		)
	}
}

export function newSafeParse<T>(input: string) {
	superJsonRegisterCustom(SuperJSON)

	try {
		return Ok(removeCirculars(SuperJSON.parse(input) as T))
	} catch (e) {
		return Err(
			createHumanLog({
				explanations: ['parsing_object_failed'],
				params: {
					parsingError: String(e)
				}
			})
		)
	}
}

export function safeStringify<T>(object: T) {
	try {
		const serializedObject = serialize(removeNonPojos(removeCirculars(object)))
		return Ok(JSON.stringify(serializedObject))
	} catch (e) {
		return Err(
			createHumanLog({
				explanations: ['stringify_object_failed'],
				params: {
					stringifyError: String(e)
				}
			})
		)
	}
}

export function safeParse<T>(input: string) {
	try {
		return Ok(parse(input) as T)
	} catch (e) {
		return Err(
			createHumanLog({
				explanations: ['parsing_object_failed'],
				params: {
					parsingError: String(e)
				}
			})
		)
	}
}
