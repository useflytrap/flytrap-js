import SuperJSON from 'superjson'
import {
	FLYTRAP_CIRCULAR,
	FLYTRAP_DOM_EVENT,
	FLYTRAP_FUNCTION,
	FLYTRAP_HEADERS,
	FLYTRAP_REQUEST,
	FLYTRAP_RESPONSE
} from './constants'

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
