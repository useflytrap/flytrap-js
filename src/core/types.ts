export type FlytrapPublicKey = `pk_${string}`
export type FlytrapSecretKey = `sk_${string}`

export type FlytrapMode = 'capture' | 'replay'

export type FlytrapConfig = {
	projectId: string
	publicApiKey: string
	privateKey?: string
	secretApiKey?: string
	captureId?: string
	mode?: FlytrapMode
}

export type ErrorType = {
	name: string
	message: string
	stack: string
	source?: SourceType
}

export type SourceType = {
	/**
	 * The path to the file where the function definition / function call is.
	 */
	filePath: string
	lineNumber: number
}

export type AddCaptureDetails<T> = T & {
	args: any[]
	timestamp: number
	source: SourceType
	error?: ErrorType
}

export type CapturedFunction = AddCaptureDetails<
	Omit<FlytrapFunctionOptions, 'filePath' | 'lineNumber'>
>
export type CapturedCall = AddCaptureDetails<
	Omit<FlytrapCallOptions, 'filePath' | 'lineNumber'>
> & {
	output?: any
}

/* export interface CapturedFunction extends Omit<FlytrapFunctionOptions, 'filePath' | 'lineNumber'> {
	// unix timestamp
	timestamp: number;
	source: SourceType;
	error?: ErrorType;
}

export interface CapturedCall extends Omit<FlytrapCallOptions, 'filePath' | 'lineNumber'> {
	timestamp: number;
	source: SourceType;
	error?: ErrorType;
} */

/* export type CapturedCall = {

} */

/* export type WrappedFunction = {
	functionId: string
	name: string
	input: any[]
	source: SourceType
	scopes: string[]
	calls: WrappedFunctionCall[]
	error?: ErrorType
} */

/* export type WrappedFunctionCall = {
	name: string
	scopes: string[]
	input: any[]
	output: any
	source: SourceType
	params: string
	functionCallId?: string
	error?: ErrorType
} */

// `useFlytrapFunction` options
export type FlytrapFunctionOptions = {
	id: string
	filePath: string
	lineNumber: number
	name: string
	scopes: string[]
	// functionId?: string
}

// `useFlytrapCall` options
export type FlytrapCallOptions = {
	id: string
	args: any[]
	// params: string
	filePath: string
	lineNumber: number
	scopes: string[]
	name: string
	functionId?: string
	// functionCallId?: string
}

// Storage
export type DatabaseCapture = {
	id: string
	createdAt: Date
	projectId: string
	status: string
	pinned: boolean
	functionName: string
	calls: string // encrypted
	functions: string // encrypted
	error?: string // encrypted
	capturedUserId?: string
	source?: SourceType
}

export type CaptureDecrypted = Omit<DatabaseCapture, 'calls' | 'functions' | 'error'> & {
	calls: CapturedCall[]
	functions: CapturedFunction[]
	error?: ErrorType
}

export type CapturePayload = Omit<DatabaseCapture, 'id' | 'createdAt' | 'status' | 'pinned'>
