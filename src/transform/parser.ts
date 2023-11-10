import { ParserOptions, parse as babelParse } from '@babel/parser'
import { err, ok } from '../core/util'
import { getParseConfig } from './config'
import { ParseErrorSpecification } from '../core/types'
import { formatBabelParseError } from './formatErrors'
import { createHumanLog } from '../core/errors'

export function parseCode(code: string, fileNamePath?: string, config?: ParserOptions) {
	try {
		return ok(babelParse(code, getParseConfig(config)))
	} catch (e) {
		const parseError = e as ParseErrorSpecification
		const formattedParsingError = formatBabelParseError(parseError, code, fileNamePath)

		const humanFriendlyError = createHumanLog({
			events: ['parsing_failed'],
			explanations: ['parsing_error_explanation'],
			solutions: ['parsing_error_open_issue', 'parsing_error_configure_babel_parser_options'],
			params: {
				fileNamePath: fileNamePath === undefined ? 'unknown file' : fileNamePath,
				parsingError: formattedParsingError
			}
		})

		return err(humanFriendlyError)
	}
}
