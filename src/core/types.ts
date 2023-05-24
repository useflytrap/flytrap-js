export type FlytrapPublicKey = `pk_${string}`
export type FlytrapSecretKey = `sk_${string}`

export type FlytrapMode = 'capture' | 'replay'

export type LogGroup =
	| 'storage'
	| 'function-execution'
	| 'call-execution'
	| 'api-calls'
	| 'identify'
	| 'capture'
	| 'transform'

export type FlytrapConfig = {
	projectId: string
	publicApiKey: string
	privateKey?: string
	secretApiKey?: string
	captureId?: string
	mode?: FlytrapMode
	logging?: LogGroup[]
	/**
	 * Set this to `true` to not push artifacts
	 * to the Flytrap API during builds. [Learn more](https://docs.useflytrap.com/config/introduction)
	 */
	disableArtifacts?: true
	/**
	 * Define packages to ignore when transforming function calls.
	 * Packages such as Zod, where there are many function calls that
	 * do not add any additional relevant context are usually good candidates
	 * to ignore. [Learn more](https://docs.useflytrap.com/config/introduction)
	 */
	packageIgnores?: string[]
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
	error?: ErrorType
}

export type CapturedFunction = AddCaptureDetails<FlytrapFunctionOptions> & {
	output?: any
}
export type CapturedCall = AddCaptureDetails<FlytrapCallOptions> & {
	output?: any
}

export type EncryptedCapturedCall = Omit<CapturedCall, 'output' | 'args' | 'error'> & {
	output?: string
	args: string
	error?: string
}

export type EncryptedCapturedFunction = Omit<CapturedFunction, 'output' | 'args' | 'error'> & {
	output?: string
	args: string
	error?: string
}

// `useFlytrapFunction` options
export type FlytrapFunctionOptions = {
	id: string
}

// `useFlytrapCall` options
export type FlytrapCallOptions = {
	id: string
	functionId?: string
	args: any[]
	name: string
}

// Storage
export type DatabaseCapture = {
	id: string
	createdAt: Date
	projectId: string
	status: string
	pinned: boolean
	functionName: string
	/* calls: string // encrypted
	functions: string // encrypted */

	calls: EncryptedCapturedCall[]
	functions: EncryptedCapturedFunction[]

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

export type Storage = {
	getItem(captureId: string): CaptureDecrypted | null
	removeItem(captureId: string): void
	setItem(captureId: string, capture: CaptureDecrypted): void
}
