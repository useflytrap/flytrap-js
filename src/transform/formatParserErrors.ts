import { ParseErrorSpecification } from '../core/types'

const getNumDigits = (number: number) => (Math.log(number) * Math.LOG10E + 1) | 0

export function formatBabelParseError(
	error: ParseErrorSpecification,
	userCode: string,
	fileNamePath?: string
): string {
	// Split the code into lines and get the relevant line.
	const codeLines = userCode.split('\n')
	const errorLine = codeLines[error.loc.line - 1]

	const errorMessage = error.message
	const errorName = error.name

	// Format the error message.
	const topLine = [
		`babel parse error: ${errorName}`,
		error.syntaxPlugin !== undefined && `syntax plugin: ${error.syntaxPlugin}`,
		error.missingPlugin !== undefined && `missing plugin(s): "${error.missingPlugin}"`,
		`---> ${fileNamePath === undefined ? 'unspecified file' : fileNamePath}:${error.loc.line}:${
			error.loc.column
		}`
	]
		.filter(Boolean)
		.join('\n')

	const errorUnderlineLength = 1

	const pointerLine =
		' '.repeat(getNumDigits(error.loc.line) + error.loc.column - getNumDigits(error.loc.line)) +
		'^'.repeat(errorUnderlineLength) +
		' ' +
		errorMessage
	const codeDisplay = [
		' '.repeat(getNumDigits(error.loc.line) + 1) + '|',
		`${error.loc.line} | ${errorLine}`,
		`${' '.repeat(getNumDigits(error.loc.line) + 1) + '|'} ${pointerLine}`
	].join('\n')

	return `${topLine}\n${codeDisplay}\n`
}
