import { ParserOptions, parse as babelParse } from '@babel/parser'
import { ParseErrorSpecification } from '../core/types'
import { formatBabelParseError } from './formatErrors'
import { createHumanLog } from '../core/errors'
import { Err, Ok } from 'ts-results'
import { getParseConfig } from './artifacts/artifacts'

export function parseCode(code: string, fileNamePath?: string, config?: ParserOptions) {
	try {
		return Ok(babelParse(code, getParseConfig(config)))
	} catch (e) {
		const parseError = e as ParseErrorSpecification
		const formattedParsingError = formatBabelParseError(parseError, code, fileNamePath)

		const humanFriendlyError = createHumanLog({
			events: ['parsing_failed'],
			explanations: ['parsing_code_explanation'],
			solutions: ['open_issue', 'parsing_error_configure_babel_parser_options'],
			params: {
				fileNamePath: fileNamePath === undefined ? 'unknown file' : fileNamePath,
				parsingError: formattedParsingError
			}
		})

		return Err(humanFriendlyError)
	}
}
