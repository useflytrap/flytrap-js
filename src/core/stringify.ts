import SuperJSON from 'superjson'
import { FLYTRAP_CIRCULAR, FLYTRAP_DOM_EVENT, FLYTRAP_FUNCTION } from './constants'

function superJsonRegisterCustom() {
	// handle functions
	SuperJSON.registerCustom<any, string>(
		{
			isApplicable: (v): v is Function => typeof v === 'function',
			serialize: () => FLYTRAP_FUNCTION,
			deserialize: () => FLYTRAP_FUNCTION
		},
		'functions'
	)

	// handle DOM events
	SuperJSON.registerCustom<any, string>(
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
	superJsonRegisterCustom()

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
	superJsonRegisterCustom()
	return SuperJSON.parse<T>(stringified)
}
