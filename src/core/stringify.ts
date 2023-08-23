import SuperJSON from 'superjson'
import {
	FLYTRAP_CIRCULAR,
	FLYTRAP_CLASS,
	FLYTRAP_DOM_EVENT,
	FLYTRAP_FUNCTION,
	FLYTRAP_HEADERS,
	FLYTRAP_REQUEST,
	FLYTRAP_RESPONSE
} from './constants'
import {
	CaptureDecryptedAndRevived,
	CaptureInvocation,
	CaptureInvocationWithLinks,
	CapturedCall,
	CapturedFunction,
	DatabaseCapture
} from './types'
import { deepEqual } from 'fast-equals'
import { decrypt } from './encryption'

export function superJsonRegisterCustom(superJsonInstance: typeof SuperJSON) {
	// Fetch API classes
	superJsonInstance.registerCustom<any, string>(
		{
			isApplicable: (v): v is Headers => v instanceof Headers,
			serialize: () => FLYTRAP_HEADERS,
			deserialize: () => FLYTRAP_HEADERS
		},
		'Headers'
	)
	superJsonInstance.registerCustom<any, string>(
		{
			isApplicable: (v): v is Response => v instanceof Response,
			serialize: () => FLYTRAP_RESPONSE,
			deserialize: () => FLYTRAP_RESPONSE
		},
		'Response'
	)
	superJsonInstance.registerCustom<any, string>(
		{
			isApplicable: (v): v is Request => v instanceof Request,
			serialize: () => FLYTRAP_REQUEST,
			deserialize: () => FLYTRAP_REQUEST
		},
		'Request'
	)

	// Functions
	superJsonInstance.registerCustom<any, string>(
		{
			isApplicable: (v): v is Function => typeof v === 'function',
			serialize: () => FLYTRAP_FUNCTION,
			deserialize: () => FLYTRAP_FUNCTION
		},
		'Functions'
	)

	// DOM Events
	superJsonInstance.registerCustom<any, string>(
		{
			isApplicable: (v): v is Event => {
				return typeof window !== 'undefined' ? v instanceof window.Event : false
			},
			serialize: () => FLYTRAP_DOM_EVENT,
			deserialize: () => FLYTRAP_DOM_EVENT
		},
		'DOM Events'
	)

	// Unsupported classes
	superJsonInstance.registerCustom<any, string>(
		{
			isApplicable: (v): v is any => {
				const SUPPORTED_CLASSES = [
					Headers,
					Request,
					Response,
					Array,
					Date,
					RegExp,
					Set,
					Map,
					Error,
					URL,
					...(typeof window !== 'undefined' ? [window.Event] : [])
				]

				const isSupportedClass = SUPPORTED_CLASSES.some(
					(classInstance) => v instanceof classInstance
				)
				return isClassInstance(v) && !isSupportedClass
			},
			serialize: () => FLYTRAP_CLASS,
			deserialize: () => FLYTRAP_CLASS
		},
		'Classes'
	)
}

export function isClassInstance<T>(obj: T): boolean {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		!(obj instanceof Array) &&
		obj.constructor &&
		obj.constructor !== Object
	)
}

/**
 * Stringifies an object, and removes all cyclical dependencies. When parsing, cyclical values become `null`.
 * @param obj object to stringify
 * @returns stringified object with cyclical dependencies removed
 */
export function stringify(obj: any): string {
	superJsonRegisterCustom(SuperJSON)

	/* if (obj[Symbol.iterator] && obj instanceof Array !== true) {
		return FLYTRAP_UNSERIALIZABLE_VALUE
	} */

	const serialized = SuperJSON.serialize(obj)
	if (serialized.meta?.referentialEqualities) {
		delete serialized.meta.referentialEqualities
	}

	function ignoreCircularReferences() {
		const seen = new WeakSet()
		return (key: any, value: any) => {
			if (key.startsWith('_')) return // Don't compare React's internal props.
			if (typeof value === 'object' && value !== null) {
				if (seen.has(value)) return FLYTRAP_CIRCULAR
				// if (seen.has(value)) return null
				seen.add(value)
			}
			return value
		}
	}

	return JSON.stringify(serialized, ignoreCircularReferences())
}

export function parse<T = unknown>(stringified: string): T {
	superJsonRegisterCustom(SuperJSON)
	return SuperJSON.parse<T>(stringified)
}

export function removeCircularDependencies<T>(obj: T, seenObjects = new Set()): T {
	// Null or primitive type
	if (obj === null || typeof obj !== 'object') {
		return obj
	}

	// Check if this object has been seen before
	if (seenObjects.has(obj)) {
		// It's a circular reference
		// @ts-expect-error
		return FLYTRAP_CIRCULAR
	}

	// Keep track of this object so we don't process it again
	seenObjects.add(obj)

	// Clone object if it's an object or an array
	const newObj = Array.isArray(obj) ? [] : {}

	// Recursively inspect each property of the object
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			const cleanedValue = removeCircularDependencies(obj[key], seenObjects)

			if (cleanedValue !== null) {
				// If it's non-circular dependency, add it to the result object
				;(newObj as T)[key] = cleanedValue
			}
		}
	}

	return newObj as T
}

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

export async function decryptCapture(
	capture: DatabaseCapture,
	privateKey: string
): Promise<CaptureDecryptedAndRevived> {
	// Decrypting `args` and `outputs`
	const decryptedArgs: any[][] = parse(await decrypt(privateKey, capture.args))
	const decryptedOutputs: any[] = parse(await decrypt(privateKey, capture.outputs))

	const revivedCalls: CapturedCall[] = []
	const revivedFunctions: CapturedFunction[] = []

	// Revive calls
	for (let i = 0; i < capture.calls.length; i++) {
		const revivedInvocations = reviveLinks(capture.calls[i].invocations, {
			args: decryptedArgs,
			outputs: decryptedOutputs
		})
		revivedCalls.push({
			id: capture.calls[i].id,
			invocations: revivedInvocations
		})
	}

	// Revive functions
	for (let i = 0; i < capture.functions.length; i++) {
		const revivedInvocations = reviveLinks(capture.functions[i].invocations, {
			args: decryptedArgs,
			outputs: decryptedOutputs
		})
		revivedFunctions.push({
			id: capture.functions[i].id,
			invocations: revivedInvocations
		})
	}

	const decryptedCaptureNew: CaptureDecryptedAndRevived = {
		projectId: capture.projectId,
		functionName: capture.functionName,
		calls: revivedCalls,
		functions: revivedFunctions,
		...(capture.error && {
			error: parse(await decrypt(privateKey, capture.error))
		})
	}
	return decryptedCaptureNew
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

export function processCaptures(captures: (CapturedCall | CapturedFunction)[]) {
	superJsonRegisterCustom(SuperJSON)
	for (let i = 0; i < captures.length; i++) {
		captures[i] = SuperJSON.deserialize(SuperJSON.serialize(captures[i]))
	}
	return captures
}
