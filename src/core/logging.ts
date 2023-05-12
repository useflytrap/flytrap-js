import { getLoadedConfig } from './config'
import { LogGroup } from './types'

function formatLogMessage(logGroup: LogGroup, message: string) {
	return `[🐛 ${logGroup}] ${message}`
}

export const log = {
	info: (logGroup: LogGroup, message: string) => {
		const currentLogGroup = getLoadedConfig()?.logging
		if (!currentLogGroup || !currentLogGroup.includes(logGroup)) {
			return
		}

		console.log(formatLogMessage(logGroup, message))
	},

	warn: (logGroup: LogGroup, message: string) => {
		const currentLogGroup = getLoadedConfig()?.logging
		if (!currentLogGroup || !currentLogGroup.includes(logGroup)) {
			return
		}

		console.warn(formatLogMessage(logGroup, message))
	},

	error: (logGroup: LogGroup, message: string) => {
		const currentLogGroup = getLoadedConfig()?.logging
		if (!currentLogGroup || !currentLogGroup.includes(logGroup)) {
			return
		}

		console.log(formatLogMessage(logGroup, message))
	}
}
