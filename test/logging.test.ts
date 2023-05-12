import { afterEach, describe, expect, it, vi } from 'vitest'
import { log } from '../src/core/logging'
import { setFlytrapConfig } from '../src/core/config'

describe('logging', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('logging disabled', () => {
		const consoleLogSpy = vi.spyOn(console, 'log')
		setFlytrapConfig({
			projectId: '',
			publicApiKey: ''
		})

		log.info('api-calls', `Downloaded capture data from API.`)
		expect(consoleLogSpy).toHaveBeenCalledTimes(0)
	})

	it('only logs chosen log groups', () => {
		const consoleLogSpy = vi.spyOn(console, 'log')
		setFlytrapConfig({
			projectId: '',
			publicApiKey: '',
			logging: ['api-calls']
		})

		log.info('api-calls', `Downloaded capture data from API.`)
		log.info('storage', `Decrypting capture data.`)

		expect(consoleLogSpy).toHaveBeenCalledTimes(1)
		expect(consoleLogSpy).toHaveBeenCalledWith(`[🐛 api-calls] Downloaded capture data from API.`)
	})
})
