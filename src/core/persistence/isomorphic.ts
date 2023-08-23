import { parse, stringify } from '../stringify'
import { CaptureDecryptedAndRevived, Persistence } from '../types'

const isBrowser = new Function('try {return this===window;}catch(e){return false;}')

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

export const filePersistence: Persistence = {
	getItem(captureId) {
		const { readFileSync } = require('fs')
		const { join } = require('path')
		const { homedir } = require('os')
		const getCacheDir = () => join(homedir(), '.flytrap-cache')
		try {
			const captureStringified = readFileSync(join(getCacheDir(), `${captureId}.json`), 'utf-8')
			if (!captureStringified) return null
			return parse<CaptureDecryptedAndRevived>(captureStringified)
		} catch (e) {
			return null
		}
	},
	removeItem(captureId) {
		const { rmSync } = require('fs')
		const { join } = require('path')
		const { homedir } = require('os')
		const getCacheDir = () => join(homedir(), '.flytrap-cache')
		return rmSync(join(getCacheDir(), `${captureId}.json`))
	},
	setItem(captureId, capture) {
		const { writeFileSync, mkdirSync } = require('fs')
		const { join } = require('path')
		const { homedir } = require('os')
		const getCacheDir = () => join(homedir(), '.flytrap-cache')
		mkdirSync(getCacheDir(), { recursive: true })
		return writeFileSync(join(getCacheDir(), `${captureId}.json`), stringify(capture))
	}
}

export function getPersistence(): Persistence {
	if (isBrowser()) {
		return browserPersistence
	}

	return filePersistence
}
