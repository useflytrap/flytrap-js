import { createHash } from 'node:crypto'

export function getFileExtension(filePath: string) {
	return filePath.slice(filePath.lastIndexOf('.'), filePath.length)
}

export function calculateSHA256Checksum(code: string): string {
	const hash = createHash('sha256')
	hash.update(code)
	return hash.digest('hex')
}
