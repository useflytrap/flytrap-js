import { it, expect, describe } from 'vitest'
import { flytrapTransformUff } from '../src/transform/index'
import { addAsync } from './testUtils'

type TransformFixture = {
	fixture: string
	expected: string
}

const createFunctionTransformFixtures = (isAsync: boolean): Record<string, TransformFixture[]> => ({
	'arrow functions': [
		{
			fixture: `const foo = ${addAsync(isAsync)}() => {}`,
			expected: `const foo = uff(${addAsync(isAsync)}() => {}, "/file.js-_foo");`
		},
		// anonymous funcs
		{
			fixture: `useEffect(${addAsync(isAsync)}() => {})`,
			expected: `useEffect(uff(${addAsync(isAsync)}() => {}, "/file.js-_anonymous"));`
		}
	],
	'function declarations': [
		{
			fixture: `${addAsync(isAsync)}function foo() {}`,
			expected: `const foo = uff(${addAsync(isAsync)}function foo() {}, "/file.js-_foo");`
		}
	],
	'function expressions': [
		{
			fixture: `const hello = function () {}`,
			expected: `const hello = uff(function () {}, "/file.js-_hello");`
		}
	]
})

const createCallTransformFixtures = (isAsync: boolean): Record<string, TransformFixture[]> => ({
	'normal calls': [
		{
			fixture: `console.log("hello world")`,
			expected: `ufc(console.log, '/file.js-call-_log')("hello world")`
		},
		{
			fixture: `foo("bar")`,
			expected: `ufc(foo)("bar")`
		}
	],
	'chained calls': [
		// chained calls
		/* {
			fixture: `const x = z.string().email()`,
			expected: ''
		},
		{
			fixture: `const { data } = await supabase.from('users').select('*')`,
			expected: `todo`
		} */
	]
})

const functionTransformFixtures = createFunctionTransformFixtures(false)

describe('functions', () => {
	for (const [suiteName, suiteFixtures] of Object.entries(functionTransformFixtures)) {
		it(`transforms ${suiteName}`, () => {
			for (let i = 0; i < suiteFixtures.length; i++) {
				const { code } = flytrapTransformUff(suiteFixtures[i].fixture, '/file.js', {
					captureDataFrom: 'functions'
				})
				expect(code).toBe(suiteFixtures[i].expected)
			}
		})
	}
})

describe.todo('calls')
