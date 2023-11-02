import { describe, expect, it } from 'vitest'
import { createHumanLog } from '../src/core/errors'
import { parse as babelParse } from '@babel/parser'
import { getParseConfig } from '../src/transform/config'
import { ParseErrorSpecification } from '../src/exports'
import { formatBabelParseError } from '../src/transform/formatParserErrors'

const parse = (code: string, fileNamePath?: string) => {
	try {
		return babelParse(code, getParseConfig())
	} catch (e) {
		const parseError = e as ParseErrorSpecification
		const formattedParsingError = formatBabelParseError(parseError, code, fileNamePath)

		return createHumanLog({
			events: ['parsing_failed'],
			explanations: ['parsing_error_explanation'],
			solutions: ['parsing_error_open_issue', 'parsing_error_configure_babel_parser_options'],
			params: {
				fileNamePath: fileNamePath === undefined ? 'unknown file' : fileNamePath,
				parsingError: formattedParsingError
			}
		}).toString()
	}
}

const redeclaringImportedTypeAsConstFixture = `
import { CapturedCall } from 'useflytrap';

export const CapturedCall = () => {
	return (
		<div></div>
	);
}
`

type ParsingErrorTest = {
	fixture: string
	getErrorMessage: (fixture: string) => string
}

const createParsingError = (
	code: string,
	fileNamePath: string,
	lineNumber: number,
	column: number,
	errorMessage: string
) => {
	const parsingErrorMessage = formatBabelParseError(
		{
			name: 'SyntaxError',
			message: errorMessage,
			loc: {
				line: lineNumber,
				column: column,
				index: -1
			},
			code: 'BABEL_PARSER_SYNTAX_ERROR',
			reasonCode: 'some reason code',
			details: {}
		},
		code,
		fileNamePath
	)

	return createHumanLog({
		events: ['parsing_failed'],
		explanations: ['parsing_error_explanation'],
		solutions: ['parsing_error_open_issue', 'parsing_error_configure_babel_parser_options'],
		params: {
			fileNamePath,
			parsingError: parsingErrorMessage
		}
	}).toString()
}

const parsingErrorFixtures: Record<string, ParsingErrorTest[]> = {
	'illegal code': [
		{
			fixture: `function foo() {-}`,
			getErrorMessage: (fixture) =>
				createParsingError(
					fixture,
					'/file.js',
					1,
					fixture.indexOf('-') + 1,
					`Unexpected token (1:17)`
				)
		},
		{
			fixture: `funct foo() {}`,
			getErrorMessage: (fixture) =>
				createParsingError(fixture, '/file.js', 1, 5, `Missing semicolon. (1:5)`)
		},
		{
			fixture: `function foo#() {}`,
			getErrorMessage: (fixture) =>
				createParsingError(fixture, '/file.js', 1, 12, `Unexpected token, expected "(" (1:12)`)
		},
		{
			fixture: `const x = 1 ++ 2;`,
			getErrorMessage: (fixture) =>
				createParsingError(
					fixture,
					'/file.js',
					1,
					10,
					`Invalid left-hand side in postfix operation. (1:10)`
				)
		}
	],
	// @todo: write more examples
	'not enabled babel syntax': [
		// throw Expressions
		{
			fixture: `function save(filename = throw new TypeError("Argument required")) {}`,
			getErrorMessage: (fixture) => ''
		},
		// do expressions
		{
			fixture: `
			let a = do {
				if (x > 10) {
					("big");
				} else {
					("small");
				}
			};`,
			getErrorMessage: (fixture) => 'todo'
		}
	]
	/* 'regression tests': [
		{
			fixture: redeclaringImportedTypeAsConstFixture,
			getErrorMessage: (fixture) => 'todo'
		},
	] */
}

describe('gives human-friendly errors when parsing invalid code', () => {
	for (const [suiteName, parseErrorTests] of Object.entries(parsingErrorFixtures)) {
		it(suiteName, () => {
			for (let i = 0; i < parseErrorTests.length; i++) {
				const parseResponse = parse(parseErrorTests[i].fixture, '/file.js')
				const expectedResponse = parseErrorTests[i].getErrorMessage(parseErrorTests[i].fixture)
				expect(parseResponse).toEqual(expectedResponse)
			}
		})
	}
})
