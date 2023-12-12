import { Err, Ok, Result } from 'ts-results'
import {
	CaptureDecryptedAndRevived,
	CapturedCall,
	CapturedFunction,
	DatabaseCapture
} from './types'
import { addLinksToCaptures, extractArgs, extractOutputs, reviveLinks } from './stringify'
import { safeParse, safeStringify } from './stringify'
import { serializeError } from 'serialize-error'
import { NO_SOURCE } from './constants'
import { createHumanLog } from './errors'

const MAX_CHUNK_SIZE = 190 // 2048 bits RSA-OAEP key size, minus padding (256 bits)
const CHUNK_SEPARATOR = '|'

export interface KeyPair {
	publicKey: string
	privateKey: string
}

export function encodeBase64(publicKey: ArrayBuffer) {
	let binaryString = ''
	try {
		const bytes = new Uint8Array(publicKey)

		bytes.forEach((byte) => {
			binaryString += String.fromCharCode(byte)
		})

		return Ok(btoa(binaryString))
	} catch (e) {
		return Err(
			createHumanLog({
				explanations: ['encode_base64_failed'],
				params: {
					inputValue: binaryString,
					encodeError: String(e)
				}
			})
		)
	}
}

export function decodeBase64(base64: string) {
	try {
		const binaryString = atob(base64)
		const len = binaryString.length
		const bytes = new Uint8Array(len)

		for (let i = 0; i < len; i++) {
			bytes[i] = binaryString.charCodeAt(i)
		}

		return Ok(bytes.buffer)
	} catch (e) {
		return Err(
			createHumanLog({
				explanations: ['decode_base64_failed'],
				params: {
					inputValue: base64,
					decodeError: String(e)
				}
			})
		)
	}
}

export async function generateKeyPair() {
	const keyPair = await crypto.subtle.generateKey(
		{
			name: 'RSA-OAEP',
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256'
		},
		true,
		['encrypt', 'decrypt']
	)

	const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey)
	const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

	const encodedPublicPrivateKeyResult = Result.all(
		encodeBase64(publicKey),
		encodeBase64(privateKey)
	)

	if (encodedPublicPrivateKeyResult.err) {
		return encodedPublicPrivateKeyResult
	}

	const [publicKeyBase64, privateKeyBase64] = encodedPublicPrivateKeyResult.val

	return Ok({
		publicKey: 'pk_' + publicKeyBase64,
		privateKey: 'sk_' + privateKeyBase64
	} satisfies KeyPair)
}

async function encryptChunk(publicKey: CryptoKey, chunk: Uint8Array): Promise<ArrayBuffer> {
	return crypto.subtle.encrypt(
		{
			name: 'RSA-OAEP'
		},
		publicKey,
		chunk
	)
}

async function decryptChunk(privateKey: CryptoKey, chunk: ArrayBuffer): Promise<ArrayBuffer> {
	return crypto.subtle.decrypt(
		{
			name: 'RSA-OAEP'
		},
		privateKey,
		chunk
	)
}

export async function encrypt(publicKeyString: string, plaintext: string) {
	if (typeof plaintext !== 'string') {
		return Err(
			createHumanLog({
				explanations: ['encrypt_failed_invalid_plaintext_type'],
				params: {
					plaintext
				}
			})
		)
	}

	if (typeof publicKeyString !== 'string') {
		return Err(
			createHumanLog({
				explanations: ['encrypt_failed_invalid_key_type'],
				params: {
					publicKey: publicKeyString
				}
			})
		)
	}

	const [, publicKeyBase64] = publicKeyString.split('pk_')
	const publicKeyBufferResult = decodeBase64(publicKeyBase64)
	if (publicKeyBufferResult.err) {
		return publicKeyBufferResult
	}

	const publicKey = await crypto.subtle.importKey(
		'spki',
		publicKeyBufferResult.val,
		{
			name: 'RSA-OAEP',
			hash: 'SHA-256'
		},
		true,
		['encrypt']
	)

	const data = new TextEncoder().encode(plaintext)
	const chunks = []

	for (let i = 0; i < data.length; i += MAX_CHUNK_SIZE) {
		const chunk = data.subarray(i, i + MAX_CHUNK_SIZE)
		const encryptedChunk = await encryptChunk(publicKey, chunk)
		const base64ChunkResult = encodeBase64(encryptedChunk)
		if (base64ChunkResult.err) {
			return base64ChunkResult
		}
		chunks.push(base64ChunkResult.val)
	}

	return Ok(chunks.join(CHUNK_SEPARATOR))
}

export async function decrypt(privateKeyString: string, ciphertext: string) {
	if (typeof ciphertext !== 'string') {
		return Err(
			createHumanLog({
				explanations: ['decrypt_failed_invalid_ciphertext_type'],
				params: {
					ciphertext
				}
			})
		)
	}

	if (typeof privateKeyString !== 'string') {
		return Err(
			createHumanLog({
				explanations: ['decrypt_failed_invalid_key_type'],
				params: {
					privateKey: privateKeyString
				}
			})
		)
	}

	const [, privateKeyBase64] = privateKeyString.split('sk_')

	const privateKeyBufferResult = decodeBase64(privateKeyBase64)
	if (privateKeyBufferResult.err) {
		return privateKeyBufferResult
	}

	const privateKey = await crypto.subtle.importKey(
		'pkcs8',
		privateKeyBufferResult.val,
		{
			name: 'RSA-OAEP',
			hash: 'SHA-256'
		},
		true,
		['decrypt']
	)

	const base64Chunks = ciphertext.split(CHUNK_SEPARATOR)
	const decryptedChunks = []

	for (const base64Chunk of base64Chunks) {
		const chunkBufferResult = decodeBase64(base64Chunk)
		if (chunkBufferResult.err) {
			return chunkBufferResult
		}
		const decryptedChunk = await decryptChunk(privateKey, chunkBufferResult.val)
		decryptedChunks.push(new Uint8Array(decryptedChunk))
	}

	const decrypted = new Uint8Array(decryptedChunks.reduce((acc, curr) => acc + curr.length, 0))
	let offset = 0

	for (const chunk of decryptedChunks) {
		decrypted.set(chunk, offset)
		offset += chunk.length
	}

	return Ok(new TextDecoder().decode(decrypted))
}

export async function encryptCapture(
	functions: CapturedFunction[],
	calls: CapturedCall[],
	buildId: string,
	publicKey: string,
	projectId: string,
	capturedUserId?: string,
	error?: any
) {
	const args = [...extractArgs(calls), ...extractArgs(functions)]
	const outputs = [...extractOutputs(calls), ...extractOutputs(functions)]
	const linkedCalls = addLinksToCaptures(calls, { args, outputs })
	const linkedFunctions = addLinksToCaptures(functions, { args, outputs })

	const serializedError = serializeError(error)

	const stringifyResult = Result.all(
		safeStringify(args),
		safeStringify(outputs),
		error !== undefined ? safeStringify(serializedError) : Ok(undefined)
	)

	if (stringifyResult.err) {
		return stringifyResult
	}

	const [stringifiedArgs, stringifiedOutputs, stringifiedError] = stringifyResult.val

	const encryptionResult = Result.all(
		await encrypt(publicKey, stringifiedArgs),
		await encrypt(publicKey, stringifiedOutputs),
		stringifiedError !== undefined ? await encrypt(publicKey, stringifiedError) : Ok(undefined)
	)

	if (encryptionResult.err) {
		return encryptionResult
	}

	const [encryptedArgs, encryptedOutputs, encryptedError] = encryptionResult.val

	return Ok({
		capturedUserId,
		projectId,
		functionName:
			serializedError.message ?? serializedError.name ?? String(serializedError ?? 'Unnamed error'),
		source: NO_SOURCE,
		args: encryptedArgs,
		outputs: encryptedOutputs,
		calls: linkedCalls,
		functions: linkedFunctions,
		buildId,
		...(encryptedError && {
			error: encryptedError
		})
	} satisfies DatabaseCapture)
}

export async function decryptCapture(capture: DatabaseCapture, privateKey: string) {
	const decryptedAndParsedArgs = (await decrypt(privateKey, capture.args)).andThen(
		safeParse<any[][]>
	)
	const decryptedAndParsedOutputs = (await decrypt(privateKey, capture.outputs)).andThen(
		safeParse<any[]>
	)
	const decryptedAndParsedError = capture.error
		? (await decrypt(privateKey, capture.error)).andThen(safeParse<Error>)
		: undefined

	const parseResults = Result.all(decryptedAndParsedArgs, decryptedAndParsedOutputs)

	if (parseResults.err) {
		// @todo: add human-friendly errors -> decrypting capture failed because encrypting or parsing error: …etc
		return parseResults
	}
	if (decryptedAndParsedError && decryptedAndParsedError.err) {
		// @todo: same as above
		return decryptedAndParsedError
	}

	const [parsedArgs, parsedOutputs] = parseResults.val

	const revivedCalls: CapturedCall[] = []
	const revivedFunctions: CapturedFunction[] = []

	// Revive calls
	for (let i = 0; i < capture.calls.length; i++) {
		const revivedInvocations = reviveLinks(capture.calls[i].invocations, {
			args: parsedArgs,
			outputs: parsedOutputs
		})
		revivedCalls.push({
			id: capture.calls[i].id,
			invocations: revivedInvocations
		})
	}

	// Revive functions
	for (let i = 0; i < capture.functions.length; i++) {
		const revivedInvocations = reviveLinks(capture.functions[i].invocations, {
			args: parsedArgs,
			outputs: parsedOutputs
		})
		revivedFunctions.push({
			id: capture.functions[i].id,
			invocations: revivedInvocations
		})
	}

	return Ok({
		...capture,
		projectId: capture.projectId,
		functionName: capture.functionName,
		calls: revivedCalls,
		functions: revivedFunctions,
		...(decryptedAndParsedError && {
			error: decryptedAndParsedError.val
		})
	} as CaptureDecryptedAndRevived)
}
