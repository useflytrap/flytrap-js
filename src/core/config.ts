import { FlytrapConfig, FlytrapPublicKey } from './types'
import { empty } from './util'

export const FLYTRAP_PACKAGE_NAME = 'useflytrap'

/**
 * Define your Flytrap configuration. `projectId` and `publicApiKey` are required.
 * @param config Flytrap configuration
 */
export function defineFlytrapConfig(config: FlytrapConfig) {
	// Check config schema
	return config
}

export async function loadConfig() {
	const config: FlytrapConfig = {
		projectId: process.env.FLYTRAP_PROJECT_ID as string,
		publicApiKey: process.env.FLYTRAP_PUBLIC_API_KEY as FlytrapPublicKey
	}

	if (empty(config.projectId, config.publicApiKey)) {
		console.warn(
			'Oops! Looks like you have forgotten to add Flytrap environment variables `FLYTRAP_PROJECT_ID` or `FLYTRAP_PUBLIC_API_KEY`, please set them.'
		)
	}

	return config
}

let _loadedConfig: FlytrapConfig | undefined = undefined

export function setFlytrapConfig(config: FlytrapConfig) {
	_loadedConfig = config
}

export const getLoadedConfig = () => _loadedConfig

export async function getFlytrapConfig() {
	if (_loadedConfig) return _loadedConfig

	_loadedConfig = await loadConfig()
	return _loadedConfig
}
