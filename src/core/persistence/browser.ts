import { parse, stringify } from '../stringify'
import { CaptureDecryptedAndRevived, Persistence } from '../types'

export const browserPersistence: Persistence = {
	getItem(captureId) {
		const captureStringified = localStorage.getItem(captureId)
		if (!captureStringified) return null
		return parse<CaptureDecryptedAndRevived>(captureStringified)
	},
	removeItem(captureId) {
		return localStorage.removeItem(captureId)
	},
	setItem(captureId, capture) {
		return localStorage.setItem(captureId, stringify(capture))
	}
}

export function getPersistence(): Persistence {
	return browserPersistence
}
