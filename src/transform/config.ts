import { lilconfig } from 'lilconfig'
import { tryCatch } from '../core/util'
import { createHumanLog } from '../core/human-logs'
import { FlytrapConfig } from '../core/types'

const esmLoader = (filePath: string) => import(filePath)

export async function loadConfig(): Promise<FlytrapConfig | undefined> {
	const moduleName = 'flytrap'

	const { search } = lilconfig('flytrap', {
		searchPlaces: [
			'package.json',
			`.${moduleName}rc.json`,
			`.${moduleName}rc.js`,
			`.${moduleName}rc.cjs`,
			`.config/${moduleName}rc`,
			`.config/${moduleName}rc.json`,
			`.config/${moduleName}rc.js`,
			`.config/${moduleName}rc.cjs`,
			`${moduleName}.config.js`,
			`${moduleName}.config.mjs`,
			`${moduleName}.config.cjs`
		],
		loaders: {
			// '.ts':
			'.js': esmLoader,
			'.mjs': esmLoader
		}
	})

	const { data: configResult, error } = await tryCatch(search())
	if (error) {
		const { message } = error as Error
		if (message.includes('Cannot use import statement outside a module')) {
			const errorLog = createHumanLog({
				event: 'config_load_failed',
				explanation: 'config_esm_inside_commonjs',
				solution: 'config_esm_inside_commonjs'
			})

			console.error('🐛 [FLYTRAP]' + errorLog.toString())
			process.exit(1)
		}
		return undefined
	}

	if (!configResult) return
	const loadedConfig = await configResult.config

	if (!loadedConfig.default) {
		const errorLog = createHumanLog({
			event: 'config_load_failed',
			explanation: 'config_no_default_export',
			solution: 'config_default_export'
		})
		console.error('🐛 [FLYTRAP]' + errorLog.toString())
		process.exit(1)
	}

	return loadedConfig.default
}
