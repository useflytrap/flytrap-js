import { FlytrapConfig } from '../core/types'
import { loadConfig as c12LoadConfig } from 'c12'
import { createHumanLog } from '../core/errors'
import { log } from '../core/logging'

export async function loadConfig(): Promise<FlytrapConfig | undefined> {
	const loadedConfig = await c12LoadConfig<FlytrapConfig>({ name: 'flytrap' })

	if (Object.keys(loadedConfig).length === 0) {
		const errorLog = createHumanLog({
			events: ['config_load_failed'],
			explanations: ['config_not_found'],
			solutions: ['define_flytrap_config']
		})

		log.error('error', errorLog.toString())
		process.exit(1)
	}

	return loadedConfig.config ?? undefined
}
