import SuperJSON from 'superjson'
import { FLYTRAP_UNSERIALIZABLE_VALUE } from './constants'
import { ignoreCircularReferences } from './util'

/**
 * Stringifies an object, and removes all cyclical dependencies. When parsing, cyclical values become `null`.
 * @param obj object to stringify
 * @returns stringified object with cyclical dependencies removed
 */
export function stringify(obj: any): string {
	// handle functions appropriately
	SuperJSON.registerCustom<any, string>(
		{
			isApplicable: (v): v is Function => typeof v === 'function',
			serialize: () => FLYTRAP_UNSERIALIZABLE_VALUE,
			deserialize: () => FLYTRAP_UNSERIALIZABLE_VALUE
		},
		'unserializable functions'
	)

	const serialized = SuperJSON.serialize(obj)
	if (serialized.meta?.referentialEqualities) {
		delete serialized.meta.referentialEqualities
	}

	return JSON.stringify(serialized, ignoreCircularReferences())
}

export function parse<T = unknown>(stringified: string): T {
	// handle functions appropriately
	SuperJSON.registerCustom<any, string>(
		{
			isApplicable: (v): v is Function => typeof v === 'function',
			serialize: () => FLYTRAP_UNSERIALIZABLE_VALUE,
			deserialize: () => FLYTRAP_UNSERIALIZABLE_VALUE
		},
		'unserializable functions'
	)

	return SuperJSON.parse<T>(stringified)
}
