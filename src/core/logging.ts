import { getLoadedConfig } from './config'
import { LogGroup } from './types'

function formatLogMessage(logGroup: LogGroup, message: string) {
	return `[🐛 ${logGroup}] ${message}`
}

export const log = {
	info: (logGroup: LogGroup, message: string, ...optionalParams: any[]) => {
		const currentLogGroup = getLoadedConfig()?.logging ?? ['error']
		if (!currentLogGroup || !currentLogGroup.includes(logGroup)) {
			return
		}

		console.log(formatLogMessage(logGroup, message), ...optionalParams)
	},

	warn: (logGroup: LogGroup, message: string, ...optionalParams: any[]) => {
		const currentLogGroup = getLoadedConfig()?.logging ?? ['error']
		if (!currentLogGroup || !currentLogGroup.includes(logGroup)) {
			return
		}

		console.warn(formatLogMessage(logGroup, message), ...optionalParams)
	},

	error: (logGroup: LogGroup, message: string, ...optionalParams: any[]) => {
		const currentLogGroup = getLoadedConfig()?.logging ?? ['error']
		if (!currentLogGroup || !currentLogGroup.includes(logGroup)) {
			return
		}

		console.log(formatLogMessage(logGroup, message), ...optionalParams)
	}
}
