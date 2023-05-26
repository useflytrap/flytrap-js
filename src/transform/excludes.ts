import { resolve } from 'path'

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
