import crypto from 'node:crypto'

export function getFileExtension(filePath: string) {
	return filePath.slice(filePath.lastIndexOf('.'), filePath.length)
}

export function calculateSHA256Checksum(code: string): string {
	const hash = crypto.createHash('sha256')
	hash.update(code)
	return hash.digest('hex')
}

/**
 * An interop function to make babel's exports work
 * @param fn default export from `@babel/traverse` or `@babel/generator`
 * @returns the correct traverse function
 */
export function _babelInterop<T>(fn: T): T {
	// @ts-ignore
	return fn.default ?? fn
}
