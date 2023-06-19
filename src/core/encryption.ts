import * as importedCrypto from 'crypto'
const crypto = typeof window !== 'undefined' ? window.crypto : importedCrypto

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

	// const publicKeyBuffer = Buffer.from(publicKeyBase64, 'base64')
	const publicKeyBuffer = isomorphicDecodeBase64(publicKeyBase64)

	// console.log("IS SAME BUFFER ?", new Uint8Array(x).toString() === new Uint8Array(publicKeyBuffer).toString())

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
		// const base64Chunk = Buffer.from(encryptedChunk).toString('base64')
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
		// const chunkBuffer = Buffer.from(base64Chunk, 'base64')
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
