export const getFileExtension = (filePath: string) =>
	filePath.slice(filePath.lastIndexOf('.'), filePath.length)
