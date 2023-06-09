import { SourceType } from './types'

export const NO_SOURCE: SourceType = { filePath: 'unknown', lineNumber: -1 }

export const FLYTRAP_UNSERIALIZABLE_VALUE = 'FLYTRAP_UNSERIALIZABLE_VALUE'
export const FLYTRAP_FUNCTION = 'FLYTRAP_FUNCTION'
export const FLYTRAP_DOM_EVENT = 'FLYTRAP_DOM_EVENT'
export const FLYTRAP_CIRCULAR = 'FLYTRAP_CIRCULAR'
export const FLYTRAP_HEADERS = 'FLYTRAP_HEADERS'
export const FLYTRAP_RESPONSE = 'FLYTRAP_RESPONSE'
export const FLYTRAP_REQUEST = 'FLYTRAP_REQUEST'
export const FLYTRAP_CLASS = 'FLYTRAP_CLASS'

export const FLYTRAP_REPLACE_VALUES = [
	FLYTRAP_UNSERIALIZABLE_VALUE,
	FLYTRAP_FUNCTION,
	FLYTRAP_DOM_EVENT,
	FLYTRAP_CIRCULAR,
	FLYTRAP_HEADERS,
	FLYTRAP_REQUEST,
	FLYTRAP_RESPONSE,
	FLYTRAP_CLASS
]
