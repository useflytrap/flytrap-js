import { resolve } from 'path'
import { _babelInterop } from './artifacts/artifacts'

/**
 * Exclude directories
 */
export function excludeDirectoriesIncludeFilePath(filePath: string, excludeDirectories: string[]) {
	return excludeDirectories.some((excludedDir) => {
		if (resolve(filePath).includes(resolve(excludedDir))) {
			return true
		}
		return false
	})
}
