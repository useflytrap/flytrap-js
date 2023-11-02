import { describe, it } from 'vitest'
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
	requiredErrorMessageParts: string[]
}

const parsingErrorFixtures: Record<string, ParsingErrorTest[]> = {
	'illegal code': [
		{
			fixture: `function foo() {-}`,
			requiredErrorMessageParts: ['Unexpected token (1:17)']
		},
		{
			fixture: `funct foo() {}`,
			requiredErrorMessageParts: ['Missing semicolon. (1:5)']
		},
		{
			fixture: `function foo#() {}`,
			requiredErrorMessageParts: ['Unexpected token, expected "(" (1:12)']
		},
		{
			fixture: `const x = 1 ++ 2;`,
			requiredErrorMessageParts: ['Invalid left-hand side in postfix operation. (1:10)']
		}
	],
	// @todo: write more examples
	'not enabled babel syntax': [
		// throw Expressions
		{
			fixture: `function save(filename = throw new TypeError("Argument required")) {}`,
			requiredErrorMessageParts: [
				'missing plugin(s): "throwExpressions"',
				'This experimental syntax requires enabling the parser plugin: "throwExpressions". (1:25)'
			]
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
			requiredErrorMessageParts: [
				'missing plugin(s): "doExpressions"',
				'This experimental syntax requires enabling the parser plugin: "doExpressions". (2:11)'
			]
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
				// const expectedResponse = parseErrorTests[i].getErrorMessage(parseErrorTests[i].fixture)

				parseErrorTests[i].requiredErrorMessageParts.forEach((messagePart) => {
					if (!(parseResponse as string).includes(messagePart)) {
						console.error('Parse response: ')
						console.error(parseResponse)
						console.error("Didn't include:", messagePart)
						throw new Error('messagePart missing.')
					}
					// expect((parseResponse as string).includes(messagePart)).toBe(true)
					// expect(parseResponse).
				})
				// expect(parseResponse).toEqual(expectedResponse)
				// expect(parseResponse).toContain(expectedResponse)
			}
		})
	}
})
