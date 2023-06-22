import { log } from './logging'
import { CaptureIgnore, CapturePayload } from './types'

export function shouldIgnoreCapture(
	capturePayload: CapturePayload,
	captureIgnores: CaptureIgnore[]
) {
	const stringCaptureIgnore = (capturePayload: CapturePayload, ignoreEntry: string) => {
		if (ignoreEntry === '') return false
		return capturePayload.functionName.includes(ignoreEntry)
	}
	const regexpCaptureIgnore = (capturePayload: CapturePayload, ignoreEntry: RegExp) => {
		const matches = capturePayload.functionName.match(ignoreEntry)
		return (matches && matches.length > 0) ?? false
	}

	for (let i = 0; i < captureIgnores.length; i++) {
		const ignoreEntry = captureIgnores[i]
		if (typeof ignoreEntry === 'string') {
			return stringCaptureIgnore(capturePayload, ignoreEntry)
		} else if (ignoreEntry instanceof RegExp) {
			return regexpCaptureIgnore(capturePayload, ignoreEntry)
		} else if (typeof ignoreEntry === 'function') {
			return ignoreEntry(capturePayload)
		} else {
			log.warn(
				'capture',
				`Invalid "captureIgnores" entry value of type "${typeof ignoreEntry}". Only strings, regular expressions and functions are supported. Learn more: https://docs.useflytrap.com/config/introduction`
			)
			return false
		}
	}
	return false
}
