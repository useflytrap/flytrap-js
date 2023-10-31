import { ParserOptions } from '@babel/parser'
import { createHumanLog } from '../core/human-logs'
import { FlytrapConfig } from '../core/types'
import { loadConfig as c12LoadConfig } from 'c12'

export async function loadConfig(): Promise<FlytrapConfig | undefined> {
	const loadedConfig = await c12LoadConfig<FlytrapConfig>({ name: 'flytrap' })

	if (Object.keys(loadedConfig).length === 0) {
		const errorLog = createHumanLog({
			event: 'config_load_failed',
			explanation: 'config_not_found',
			solution: 'define_flytrap_config'
		})

		console.error('🐛 [FLYTRAP]' + errorLog.toString())
		process.exit(1)
	}

	return loadedConfig.config ?? undefined
}

export function getParseConfig(config: ParserOptions = {}): ParserOptions {
	return {
		sourceType: 'module',
		plugins: ['jsx', 'typescript'],
		...config
	}
}
