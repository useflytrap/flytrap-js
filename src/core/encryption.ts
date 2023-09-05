import * as importedCrypto from 'crypto'
import {
	CaptureDecryptedAndRevived,
	CapturePayload,
	CapturedCall,
	CapturedFunction,
	DatabaseCapture
} from './types'
import {
	addLinksToCaptures,
	extractArgs,
	extractOutputs,
	parse,
	reviveLinks,
	stringify
} from './stringify'
import { serializeError } from 'serialize-error'
import { NO_SOURCE } from './constants'
import { err, ok, tryCatch, tryCatchSync } from './util'

function getCrypto() {
	// Check if the environment is a Web Worker
	if (typeof self !== 'undefined' && typeof self.crypto !== 'undefined') {
		return self.crypto
	}
	// Check if the environment is a browser
	if (typeof window !== 'undefined' && typeof window.crypto !== 'undefined') {
		return window.crypto
	}

	return importedCrypto
}

const crypto = getCrypto()

const MAX_CHUNK_SIZE = 190 // 2048 bits RSA-OAEP key size, minus padding (256 bits)
const CHUNK_SEPARATOR = '|'

export interface KeyPair {
	publicKey: string
	privateKey: string
}

function isomorphicEncodeBase64(publicKey: ArrayBuffer) {
	if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
		return Buffer.from(publicKey).toString('base64')
	}
	return btoa(new Uint8Array(publicKey).reduce((acc, byte) => acc + String.fromCharCode(byte), ''))
}

function isomorphicDecodeBase64(base64: string): ArrayBuffer {
	if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
		return Buffer.from(base64, 'base64')
	}

	const binaryString = atob(base64)
	const arrayBuffer = new ArrayBuffer(binaryString.length)
	const uint8Array = new Uint8Array(arrayBuffer)

	for (let i = 0; i < binaryString.length; i++) {
		uint8Array[i] = binaryString.charCodeAt(i)
	}

	return arrayBuffer
}

export async function generateKeyPair(): Promise<KeyPair> {
	const keyPair = await crypto.subtle.generateKey(
		{
			name: 'RSA-OAEP',
			modulusLength: 2048,
			publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
			hash: 'SHA-256'
		},
		true,
		['encrypt', 'decrypt']
	)

	const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey)
	const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

	return {
		publicKey: 'pk_' + isomorphicEncodeBase64(publicKey),
		privateKey: 'sk_' + isomorphicEncodeBase64(privateKey)
	}
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

export async function encrypt(publicKeyString: string, plaintext: string): Promise<string> {
	if (typeof plaintext !== 'string') {
		throw new Error(`encrypt() only allows string values, received "${typeof publicKeyString}".`)
	}

	if (typeof publicKeyString !== 'string') {
		throw new Error(
			`encrypt() only allows public keys in string format, received "${typeof publicKeyString}".`
		)
	}

	const [, publicKeyBase64] = publicKeyString.split('pk_')
	const publicKeyBuffer = isomorphicDecodeBase64(publicKeyBase64)

	const publicKey = await crypto.subtle.importKey(
		'spki',
		publicKeyBuffer,
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
		const base64Chunk = isomorphicEncodeBase64(encryptedChunk)
		chunks.push(base64Chunk)
	}

	return chunks.join(CHUNK_SEPARATOR)
}

export async function decrypt(privateKeyString: string, ciphertext: string): Promise<string> {
	if (typeof ciphertext !== 'string') {
		throw new Error(
			`decrypt() only allows string cipher text values, received "${typeof ciphertext}".`
		)
	}

	if (typeof privateKeyString !== 'string') {
		throw new Error(
			`decrypt() only allows private keys in string format, received "${typeof privateKeyString}".`
		)
	}

	const [, privateKeyBase64] = privateKeyString.split('sk_')

	// const privateKeyBuffer = Buffer.from(privateKeyBase64, 'base64')
	const privateKeyBuffer = isomorphicDecodeBase64(privateKeyBase64)
	const privateKey = await crypto.subtle.importKey(
		'pkcs8',
		privateKeyBuffer,
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
		const chunkBuffer = isomorphicDecodeBase64(base64Chunk)
		const decryptedChunk = await decryptChunk(privateKey, chunkBuffer)
		decryptedChunks.push(new Uint8Array(decryptedChunk))
	}

	const decrypted = new Uint8Array(decryptedChunks.reduce((acc, curr) => acc + curr.length, 0))
	let offset = 0

	for (const chunk of decryptedChunks) {
		decrypted.set(chunk, offset)
		offset += chunk.length
	}

	return new TextDecoder().decode(decrypted)
}

export async function encryptCapture(
	functions: CapturedFunction[],
	calls: CapturedCall[],
	publicKey: string,
	projectId: string,
	capturedUserId?: string,
	error?: string | Error
) {
	const args = [...extractArgs(calls), ...extractArgs(functions)]
	const outputs = [...extractOutputs(calls), ...extractOutputs(functions)]
	const linkedCalls = addLinksToCaptures(calls, { args, outputs })
	const linkedFunctions = addLinksToCaptures(functions, { args, outputs })

	return {
		capturedUserId,
		projectId,
		functionName:
			typeof error === 'string'
				? error
				: serializeError(error)?.message ?? serializeError(error)?.name ?? 'unknown',
		source: NO_SOURCE,
		// args, outputs,
		args: await encrypt(publicKey, stringify(args)),
		outputs: await encrypt(publicKey, stringify(outputs)),
		calls: linkedCalls,
		functions: linkedFunctions,
		...(error && {
			error: await encrypt(publicKey, stringify(serializeError(error)))
		})
	}
}

export async function decryptFunction(capture: DatabaseCapture, privateKey: string) {
	const { data: decryptedArgsString, error: decryptArgsError } = await tryCatch(
		decrypt(privateKey, capture.args)
	)
	const { data: decryptedOutputsString, error: decryptOutputsError } = await tryCatch(
		decrypt(privateKey, capture.outputs)
	)

	if (
		decryptArgsError ||
		decryptOutputsError ||
		decryptedArgsString === null ||
		decryptedOutputsString === null
	) {
		return err('An error occurred when decrypting capture.')
	}

	// Decrypting `args` and `outputs`
	const { data: decryptedArgs, error: parseArgsError } = tryCatchSync(() =>
		parse<any[][]>(decryptedArgsString)
	)
	const { data: decryptedOutputs, error: parseOutputsError } = tryCatchSync(() =>
		parse<any[]>(decryptedOutputsString)
	)

	if (parseArgsError || parseOutputsError || decryptedArgs === null || decryptedOutputs === null) {
		return err('An error occured when parsing the decrypted capture.')
	}

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

	return ok(decryptedCaptureNew)
}
