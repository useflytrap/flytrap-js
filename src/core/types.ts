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
	| 'cache'

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
	/**
	 * Define directories to ignore when transforming function calls.
	 * Directories that contain stateless or simple UI components are
	 * usually good candidates to ignore, so we don't send useless context.
	 *
	 * @example
	 * ```typescript
	 * defineFlytrapConfig({
	 * 	excludeDirectories: ['./src/components/ui']
	 * })
	 * ```
	 * [Learn more](https://docs.useflytrap.com/config/introduction)
	 */
	excludeDirectories?: string[]
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

export type CaptureInvocation = {
	args: any[]
	timestamp: number
	error?: ErrorType
	output?: any
}
export type EncryptedCaptureInvocation = Omit<CaptureInvocation, 'args' | 'error' | 'output'> & {
	args: string
	error?: string
	output?: string
}

export type CapturedFunction<T = CaptureInvocation> = FlytrapFunctionOptions & {
	invocations: T[]
}

export type CapturedCall<T = CaptureInvocation> = Omit<FlytrapCallOptions, 'args' | 'name'> & {
	invocations: T[]
}

export type EncryptedCapturedCall = CapturedCall<EncryptedCaptureInvocation>
export type EncryptedCapturedFunction = CapturedFunction<EncryptedCaptureInvocation>

// `useFlytrapFunction` options
export type FlytrapFunctionOptions = {
	id: string
}

// `useFlytrapCall` options
export type FlytrapCallOptions = {
	id: string
	// functionId?: string
	args: any[]
	name: string
}

// Storage
export type DatabaseCapture = {
	projectId: string
	functionName: string

	args: string // encrypted
	outputs: string // encrypted

	calls: CapturedCall<CaptureInvocationWithLinks>[]
	functions: CapturedCall<CaptureInvocationWithLinks>[]

	error?: string // encrypted
	capturedUserId?: string
	source?: SourceType
}

export type CaptureDecrypted = Omit<DatabaseCapture, 'args' | 'outputs'> & {
	args: any[][]
	outputs: any[]
	error?: ErrorType
}

export type CaptureDecryptedAndRevived = Omit<
	DatabaseCapture,
	'args' | 'outputs' | 'calls' | 'functions' | 'error'
> & {
	calls: CapturedCall[]
	functions: CapturedCall[]
	error?: ErrorType
}

export type CapturePayload = DatabaseCapture

export type Storage = {
	getItem(captureId: string): CaptureDecryptedAndRevived | null
	removeItem(captureId: string): void
	setItem(captureId: string, capture: CaptureDecryptedAndRevived): void
}

export type CaptureInvocationWithLinks = Omit<CaptureInvocation, 'args' | 'output'> & {
	args: number
	output: number
}

export type Artifact = {
	type: 'CALL' | 'FUNCTION'
	functionOrCallId: string
	functionOrCallName: string
	source: SourceType
	scopes: string[]
	params: string
	/**
	 * `functionId` can only defined if `type` === 'CALL'
	 */
	functionId?: string
}

export type DatabaseArtifact = Artifact & {
	id: string
	createdAt: string
	projectId: string
	functionId: null | undefined | string
}

export type ArtifactCacheEntry = {
	timestamp: number
	uploadStatus: 'not-uploaded' | 'uploaded' | 'upload-failed'
	artifact: Artifact
}

export type CacheFile = {
	projectId: string
	createdTimestamp: number
	artifactCacheEntries: ArtifactCacheEntry[]
}
