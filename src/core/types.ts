import type { ParserOptions } from '@babel/parser'

export type FlytrapPublicKey = `pk_${string}`
export type FlytrapSecretKey = `sk_${string}`

export type FlytrapMode = 'capture' | 'replay' | 'troubleshoot'

export type CaptureAmountLimit =
	// size based
	| `${number} b`
	| `${number}b`
	| `${number} kb`
	| `${number}kb`
	| `${number} mb`
	| `${number}mb`
	// file based
	| `${number} files`
	| `${number}files`

export type CaptureAmountLimitType =
	| {
			type: 'size'
			sizeLimit: number
	  }
	| {
			type: 'files'
			fileLimit: number
	  }

export type LogGroup =
	| 'error'
	| 'storage'
	| 'function-execution'
	| 'call-execution'
	| 'api-calls'
	| 'identify'
	| 'capture'
	| 'transform'

export type CaptureIgnore = string | RegExp | ((payload: CapturePayload) => boolean)

export type FlytrapConfig = {
	projectId: string
	publicApiKey: string
	privateKey?: string
	secretApiKey?: string
	captureId?: string
	mode?: FlytrapMode
	/**
	 * Enable logging for different parts of the Flytrap SDK. By default only errors are logged.
	 *
	 * - "capture": logs when something is captured
	 * - "error": logs when something goes wrong
	 * - "storage": logs when a capture is saved or fetched from the Flytrap API
	 * - "function-execution": logs when a function executes. Useful for debugging.
	 * - "call-execution": logs when a function call executes. Useful for debugging.
	 * - "identify": logs when a user is being identified
	 * - "transform": logs details regarding to the transformation of code at build time
	 *
	 * @default ["error"]
	 */
	logging?: LogGroup[]
	babel?: {
		parserOptions?: ParserOptions
	}
	/**
	 * The API base address.
	 * @default "https://www.useflytrap.com"
	 */
	apiBase?: string
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
	/**
	 * Define function names to ignore when transforming function calls.
	 * Helpful to ignore function macros such as Vue's `defineProps` macro.
	 *
	 * @example
	 * ```typescript
	 * defineFlytrapConfig({
	 * 	 excludeFunctionNames: ['defineProps']
	 * })
	 * ```
	 * [Learn more](https://docs.useflytrap.com/config/introduction)
	 */
	excludeFunctionNames?: string[]
	/**
	 * Prevent certain captures from being sent to the Flytrap API. Ignoring
	 * captures is useful if there are certain errors that are expected to be
	 * thrown, for example "UNAUTHORIZED" tRPC responses.
	 *
	 * Capture ignores can be defined using partial matching of the capture
	 * name, regular expressions or a function that returns a boolean. If any
	 * of the ignore criteria returns true, the capture is ignored.
	 *
	 * @example
	 * ```typescript
	 * defineFlytrapConfig({
	 * 	captureIgnores: [
	 * 		// Ignore captures whose name matches below regex
	 * 		/Hello World/g,
	 * 		// Ignore captures whose name contains "UNAUTHORIZED"
	 * 		"UNAUTHORIZED",
	 * 		// Ignore all captures
	 * 		(capture: CapturePayload) => true
	 * 	]
	 * })
	 * ```
	 * [Learn more](https://docs.useflytrap.com/config/introduction)
	 */
	captureIgnores?: CaptureIgnore[]
	/**
	 * Use Flytrap in environments with access to only browser APIs, eg. Cloudflare
	 * Workers & Pages and Deno Deploy.
	 *
	 * @deprecated Starting from v0.8 the Flytrap SDK only uses browser & edge-friendly APIs, meaning that the `browser` option is no longer needed.
	 */
	browser?: true
	transformOptions?: {
		/**
		 * Allows you to define what code gets transformed by the Flytrap code transform and subsequently, what code data gets captured from. By default all code gets transformed and captured.
		 *
		 * By default, nothing is disabled.
		 */
		disableTransformation?: (
			| 'arrow-function'
			| 'function-declaration'
			| 'function-expression'
			| 'call-expression'
		)[]
		/**
		 * What import format to use for the automatically injected Flytrap imports.
		 * @default "esm"
		 */
		importFormat?: 'esm' | 'commonjs'
	}
	/**
	 * Use this to limit the size of your captures or limit the amount of files that context gets sent from.
	 */
	captureAmountLimit?: CaptureAmountLimit
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
	functions: CapturedFunction<CaptureInvocationWithLinks>[]

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
	functions: CapturedFunction[]
	error?: ErrorType
}

export type CapturePayload = DatabaseCapture

export type CaptureInvocationWithLinks = Omit<CaptureInvocation, 'args' | 'output'> & {
	args: number
	output: number
}

export type ArtifactMarking = {
	type: 'arguments' | 'call' | 'function' | 'params'
	functionOrCallId: string
	startIndex: number
	endIndex: number
}

export type Artifact = {
	encryptedSource: string
	checksum: string
	filePath: string
}

export type DatabaseArtifact = Artifact & {
	id: string
	createdAt: string
	projectId: string
}

// Adapter types

export type Persistence = {
	getItem: (captureId: string) => CaptureDecryptedAndRevived | null
	removeItem: (captureId: string) => void
	setItem: (captureId: string, capture: CaptureDecryptedAndRevived) => void
}
export type Storage = {
	getCapture: (captureId: string) => CaptureDecryptedAndRevived | null
	/**
	 * Load the wrapped functions from the API. These are decrypted before
	 * returning them.
	 * @returns
	 */
	loadCapture: (
		captureId: string,
		secretApiKey: string,
		privateKey: string
	) => Promise<CaptureDecryptedAndRevived | undefined>
	saveCapture: (
		functions: CapturedFunction[],
		calls: CapturedCall[],
		error?: Error | string
	) => Promise<void>
}
export type Encryption = {
	encrypt: (publicKeyString: string, plaintext: string) => Promise<string>
	decrypt: (privateKeyString: string, ciphertext: string) => Promise<string>
}

export type Adapter = {
	persistence: Persistence
	// storage: Storage;
	encryption: Encryption
}

// Source: https://github.com/babel/babel/blob/main/packages/babel-parser/src/parse-error.ts
// Babel doesn't export these types correctly in v7

type SyntaxPlugin = 'flow' | 'typescript' | 'jsx' | 'pipelineOperator' | 'placeholders'

type ParseErrorCode = 'BABEL_PARSER_SYNTAX_ERROR' | 'BABEL_PARSER_SOURCETYPE_MODULE_REQUIRED'

export type Position = {
	line: number
	column: number
	index: number
}

export interface ParseErrorSpecification<ErrorDetails = unknown> extends Error {
	code: ParseErrorCode
	reasonCode: string
	syntaxPlugin?: SyntaxPlugin
	missingPlugin?: string | string[]
	loc: Position
	details: ErrorDetails

	// We should consider removing this as it now just contains the same
	// information as `loc.index`.
	// pos: number;
}

export type AnyFunction = (...args: any[]) => any

export type ScriptTagMeta = {
	start: number
	end: number
	content: string
}
