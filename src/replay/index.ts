// An isomorphic storage
import { Err, Ok } from 'ts-results'
import { getLoadedConfig } from '../core/config'
import { CaptureDecryptedAndRevived } from '../core/types'
import { createHumanLog } from '../core/errors'
import { fetchCapture } from '../core/storage'
import { log } from '../core/logging'
import { safeParse, safeStringify } from '../core/stringify'

function isBrowser(): boolean {
	try {
		// Check for the window object
		if (typeof window !== 'undefined') {
			return typeof window.document !== 'undefined' && typeof window.navigator !== 'undefined'
		}
		return false
	} catch (e) {
		return false
	}
}

type IsomorphicStorage = {
	getItem(captureId: string): CaptureDecryptedAndRevived | undefined
	setItem(captureId: string, capture: CaptureDecryptedAndRevived | undefined): void
}

const isomorphicStorage: IsomorphicStorage = {
	getItem(captureId) {
		if (isBrowser()) {
			// Implementation for browser
			const savedCaptureString = localStorage.getItem(captureId)
			if (savedCaptureString === null) {
				return undefined
			}
			return safeParse<CaptureDecryptedAndRevived>(savedCaptureString).unwrap()
		} else {
			// NodeJS implementation
			const { readFileSync } = require('fs')
			const { join } = require('path')
			const { homedir } = require('os')
			const getCacheDir = () => join(homedir(), '.flytrap-cache')
			try {
				const captureStringified = readFileSync(join(getCacheDir(), `${captureId}.json`), 'utf-8')
				if (captureStringified === null) return undefined
				return safeParse<CaptureDecryptedAndRevived>(captureStringified).unwrap()
			} catch (e) {
				log.error('error', `Replaying error when fetching stored captures: Error: ${String(e)}`)
				return undefined
			}
		}
	},
	setItem(captureId, capture) {
		if (isBrowser()) {
			// Implementation for browser
			const stringifiedCapture = safeStringify(capture)
			localStorage.setItem(captureId, stringifiedCapture.unwrap())
		} else {
			// NodeJS implementation
			const { writeFileSync, mkdirSync } = require('fs')
			const { join } = require('path')
			const { homedir } = require('os')
			const getCacheDir = () => join(homedir(), '.flytrap-cache')
			mkdirSync(getCacheDir(), { recursive: true })
			return writeFileSync(
				join(getCacheDir(), `${captureId}.json`),
				safeStringify(capture).unwrap()
			)
		}
	}
}

export function getCapture() {
	const { captureId, secretApiKey, privateKey } = getLoadedConfig() ?? {}

	if (!captureId || !secretApiKey || !privateKey) {
		return Err(
			createHumanLog({
				events: ['replay_failed'],
				explanations: ['missing_replay_config_values'],
				solutions: ['configuration_fix']
			})
		)
	}

	const loadedCapture = isomorphicStorage.getItem(captureId)
	if (loadedCapture) {
		return Ok(loadedCapture)
	}

	fetchCapture(captureId, secretApiKey, privateKey).then((captureResult) => {
		if (captureResult.err) {
			const errorLog = captureResult.val
			errorLog.addEvents(['replay_failed'])
			log.error('error', errorLog.toString())
			return
		}
		isomorphicStorage.setItem(captureId, captureResult.val)
		log.info('storage', 'Replay data loaded!')
	})

	return Err(
		createHumanLog({
			events: ['replay_failed'],
			explanations: ['replay_data_not_loaded']
		})
	)
}
