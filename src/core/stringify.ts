import SuperJSON from 'superjson'
import {
	FLYTRAP_CIRCULAR,
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
import { copy } from 'copy-anything'

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

	// handle functions
	superJsonInstance.registerCustom<any, string>(
		{
			isApplicable: (v): v is Function => typeof v === 'function',
			serialize: () => FLYTRAP_FUNCTION,
			deserialize: () => FLYTRAP_FUNCTION
		},
		'functions'
	)

	// handle DOM events
	superJsonInstance.registerCustom<any, string>(
		{
			isApplicable: (v): v is Event => {
				return typeof window !== 'undefined' ? v instanceof window.Event : false
			},
			serialize: () => FLYTRAP_DOM_EVENT,
			deserialize: () => FLYTRAP_DOM_EVENT
		},
		'dom events'
	)
}

/**
 * Stringifies an object, and removes all cyclical dependencies. When parsing, cyclical values become `null`.
 * @param obj object to stringify
 * @returns stringified object with cyclical dependencies removed
 */
export function stringify(obj: any): string {
	superJsonRegisterCustom(SuperJSON)

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

export function removeCircularDependencies<T>(obj: T): T {
	superJsonRegisterCustom(SuperJSON)
	const serialized = SuperJSON.serialize(obj)
	if (serialized.meta?.referentialEqualities) {
		delete serialized.meta.referentialEqualities
	}

	return SuperJSON.deserialize(serialized)
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

export function extractOutputs(captures: (CapturedCall | CapturedFunction)[]): any[][] {
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
	const invocationsCopy = copy(invocations)

	for (let i = 0; i < invocationsCopy.length; i++) {
		// Args
		const argsIndex = _findIndexOfMatchingValue(args, invocationsCopy[i].args)
		const outputIndex = _findIndexOfMatchingValue(outputs, invocationsCopy[i].output)

		if (argsIndex !== undefined) {
			// @ts-expect-error
			invocationsCopy[i].args = argsIndex
		}
		if (outputIndex !== undefined) {
			invocationsCopy[i].output = outputIndex
		}
	}
	return invocationsCopy as unknown as CaptureInvocationWithLinks[]
}

export function addLinksToCaptures(
	captures: (CapturedCall | CapturedFunction)[],
	{ args, outputs }: { args: any[][]; outputs: any[] }
) {
	const capturesCopy = copy(captures)
	for (let i = 0; i < capturesCopy.length; i++) {
		// captures[i].invocations
		const linkedInvocations = addLinks(capturesCopy[i].invocations, { args, outputs })
		// @ts-expect-error
		capturesCopy[i].invocations = linkedInvocations
	}

	return capturesCopy as unknown as (
		| CapturedCall<CaptureInvocationWithLinks>
		| CapturedFunction<CaptureInvocationWithLinks>
	)[]
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
	const invocationsCopy = copy(invocations)

	for (let i = 0; i < invocationsCopy.length; i++) {
		// Revive args
		const argsIndex = invocationsCopy[i].args
		;(invocationsCopy[i] as unknown as CaptureInvocation).args = args[argsIndex]

		// Outputs
		const outputIndex = invocationsCopy[i].output
		invocationsCopy[i].output = outputs[outputIndex]
	}

	return invocationsCopy as unknown as CaptureInvocation[]
}
