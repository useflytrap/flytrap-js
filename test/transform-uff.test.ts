import { it, expect, describe } from 'vitest'
import { flytrapTransformUff, getCalleeAndAccessorKey } from '../src/transform/index'
import { addAsync, toOneLine } from './testUtils'
import { parseCode } from '../src/transform/parser'
import generate from '@babel/generator'

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
			fixture: `console.log("hello world");`,
			expected: `ufc(console, {
				id: "/file.js-call-_log",
				args: ["hello world"],
				name: "log"
			});`
		}
		/* {
			fixture: `foo("bar")`,
			expected: `ufc(foo, "/file.js-call-_foo")("bar");`
		} */
	],
	'correct accessorKey': [
		// for loops
		{
			fixture: `foo[i]();`,
			expected: `ufc(foo, {
				id: "/file.js-call-_fooI",
				args: [],
				name: i
			})`
		}
		// numbers
	],
	this: [
		{
			fixture: `this.hello();`,
			expected: `this.hello();`
		}
	],
	/* 'class instance calls': [
		{
			fixture: `const greeter = new Greeter("Hello");
								const greetResponse = greeter.greet("hello world")`,
			expected: `const greeter = new Greeter("Hello");
								const greetResponse = ufc(greeter.greet, greeter)("hello world")`
		}
	], */
	'chained calls': [
		// chained calls
		/* {
			fixture: `const x = z.string().email();`,
			expected: 'const x = z.string().email();'
		}, */
		/* {
			fixture: `const { data } = await supabase.from('users').select('*')`,
			expected: `todo`
		} */
	],
	regressions: [
		{
			fixture: `subscriber[1]();`,
			expected: `ufc(subscriber, {
				id: "/file.js-call-_subscriber",
				args: [],
				name: 1
			})`
		}
	]
})

const functionTransformFixtures = createFunctionTransformFixtures(false)

describe('functions', () => {
	for (const [suiteName, suiteFixtures] of Object.entries(functionTransformFixtures)) {
		it(`transforms ${suiteName}`, () => {
			for (let i = 0; i < suiteFixtures.length; i++) {
				const { code } = flytrapTransformUff(suiteFixtures[i].fixture, '/file.js', {
					transformOptions: {
						disableTransformation: ['call-expression']
					}
				})
				expect(toOneLine(code)).toBe(toOneLine(suiteFixtures[i].expected))
			}
		})
	}
})

it('callee and accessorKey are correct', () => {
	const accessorKeyFixtures = [
		/* {
			fixture: 'parseFloat',
			expected: {
				callee: 'parseFloat',
				accessorKey: undefined
			}
		}, */
		{
			fixture: 'console.log',
			expected: {
				callee: 'console',
				accessorKey: '"log"'
			}
		},
		{
			fixture: 'foo.xyz.bar.console.log',
			expected: {
				callee: 'foo.xyz.bar.console',
				accessorKey: '"log"'
			}
		},
		{
			fixture: 'console["log"]',
			expected: {
				callee: 'console',
				accessorKey: '"log"'
			}
		},
		{
			fixture: 'foo.bar.console["log"]',
			expected: {
				callee: 'foo.bar.console',
				accessorKey: '"log"'
			}
		},
		{
			fixture: 'subscribe[1]',
			expected: {
				callee: 'subscribe',
				accessorKey: '1'
			}
		},
		{
			fixture: 'foo.bar.subscribe[1]',
			expected: {
				callee: 'foo.bar.subscribe',
				accessorKey: '1'
			}
		}
	]

	for (let i = 0; i < accessorKeyFixtures.length; i++) {
		const fixture = accessorKeyFixtures[i].fixture

		// @ts-expect-error
		const node = parseCode(fixture).unwrap().program?.body?.[0]?.expression
		if (node === undefined) {
			throw new Error(`Could not parse fixture "${fixture}"`)
		}

		const { callee, accessorKey } = getCalleeAndAccessorKey(node)
		if (!callee) {
			throw new Error(`Callee is undefined.`)
		}

		expect(generate(callee).code).toBe(accessorKeyFixtures[i].expected.callee)
		// @ts-ignore
		expect(generate(accessorKey).code).toBe(accessorKeyFixtures[i].expected.accessorKey)
	}
})

const callTransformFixtures = createCallTransformFixtures(false)

describe('calls', () => {
	for (const [suiteName, suiteFixtures] of Object.entries(callTransformFixtures)) {
		it(`transforms ${suiteName}`, () => {
			for (let i = 0; i < suiteFixtures.length; i++) {
				const { code } = flytrapTransformUff(suiteFixtures[i].fixture, '/file.js', {
					transformOptions: {
						disableTransformation: ['arrow-function', 'function-declaration', 'function-expression']
					}
				})
				expect(toOneLine(code)).toBe(toOneLine(suiteFixtures[i].expected))
			}
		})
	}
})
