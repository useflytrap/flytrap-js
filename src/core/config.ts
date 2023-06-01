import { FlytrapConfig } from './types'
import { empty } from './util'

export const FLYTRAP_PACKAGE_NAME = 'useflytrap'
export const FLYTRAP_API_BASE = 'https://www.useflytrap.com'

let _loadedConfig: FlytrapConfig | undefined = undefined

/**
 * Define your Flytrap configuration. `projectId` and `publicApiKey` are required.
 * @param config Flytrap configuration
 */
export function defineFlytrapConfig(config: FlytrapConfig) {
	// Check config schema
	return config
}

export function setFlytrapConfig(config: FlytrapConfig) {
	if (empty(config.projectId, config.publicApiKey)) {
		console.warn(
			'Oops! You are trying to set your Flytrap config without a value for `projectId` or `publicApiKey`, please set them using the Flytrap configuration file.'
		)
	}

	_loadedConfig = config
}

export const getLoadedConfig = () => _loadedConfig
