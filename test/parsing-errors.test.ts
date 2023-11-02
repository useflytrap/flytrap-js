import { describe, expect, it } from 'vitest'
import { parseCode } from '../src/transform/parser'

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
				const { error, data } = parseCode(parseErrorTests[i].fixture, '/file.js')
				expect(data).toBe(null)

				parseErrorTests[i].requiredErrorMessageParts.forEach((messagePart) => {
					if (error === null) {
						throw new Error('Parsing succeeded.')
					}
					const errorString = error.toString()

					if (!errorString.includes(messagePart)) {
						console.error('Parse response: ')
						console.error(errorString)
						console.error("Didn't include:", messagePart)
						throw new Error('messagePart missing.')
					}
				})
			}
		})
	}
})
