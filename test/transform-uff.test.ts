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

const functionHoistingFixture: Record<string, TransformFixture[]> = {
	'hoists top level scope': [
		{
			fixture: `
			console.log(foo());
			function foo() {}
			`,
			expected: `
			const foo = uff(function foo() {}, '/file.js-_foo');
			console.log(foo());
			`
		}
	],
	'hoists inside arrow functions': [
		{
			fixture: `
			() => {
				console.log(foo());
				function foo() {}
			}
			`,
			expected: `
			uff(() => {
				const foo = uff(function foo() {}, '/file.js-_anonymousFoo');
				console.log(foo());
			}, '/file.js-_anonymous')
			`
		}
	],
	'hoists inside function expressions': [
		{
			fixture: `
			const x = function() {
				console.log(foo());
				function foo() {}
			}
			`,
			expected: `
			const x = uff(function() {
				const foo = uff(function foo() {}, '/file.js-_anonymousFoo');
				console.log(foo());
			}, '/file.js-_x')
			`
		}
	],
	'hoists inside function declarations': [
		{
			fixture: `
			function bar() {
				console.log(foo());
				function foo() {}
			}
			`,
			expected: `
			const bar = uff(function bar() {
				const foo = uff(function foo() {}, '/file.js-_barFoo');
				console.log(foo());
			}, '/file.js-_bar')
			`
		}
	],
	'hoists inside block scopes': [
		{
			fixture: `
			{
				console.log(foo());
				function foo() {}
			}
			`,
			expected: `
			{
				const foo = uff(function foo() {}, '/file.js-_foo');
				console.log(foo());
			}`
		}
	],
	'hoisted functions continue being traversed and transformed': [
		{
			fixture: `
			console.log(foo())
			function foo() {
				const bar = () => {};
			}
			`,
			expected: `
			const foo = uff(function foo() {
				const bar = uff(() => {}, '/file.js-_fooBar')
			}, '/file.js-_foo')
			console.log(foo())
			`
		}
	],
	'code doesnt get hoisted above directives': [
		{
			fixture: `
			'use client';
			
			console.log(foo());
			function foo() {}
			`,
			expected: `
			'use client';

			const foo = uff(function foo() {}, '/file.js-_foo');
			console.log(foo());`
		},
		{
			fixture: `
			async function myAction() {
				'use server'

				console.log(foo());
				function foo() {}
			}`,
			expected: `
			const myAction = uff(async function myAction() {
				'use server'

				const foo = uff(function foo() {}, '/file.js-_myActionFoo');
				console.log(foo());
			}, '/file.js-_myAction')
			`
		}
	],
	'code doesnt get hoisted above imports': [
		{
			fixture: `
			import { uff } from 'useflytrap';

			console.log(foo());
			function foo() {}
			`,
			expected: `
			import { uff } from 'useflytrap';
			const foo = uff(function foo() {}, '/file.js-_foo');
			console.log(foo());
			`
		}
	],
	'hoists default & named exports': [
		// default
		{
			fixture: `
			console.log(foo())
			export default function foo() {}`,
			expected: `
			export default uff(function foo() {}, '/file.js-_foo')
			console.log(foo())`
		},
		{
			fixture: `
			console.log(foo())
			export default function() {}`,
			expected: `
			export default uff(function() {}, '/file.js-_anonymous')
			console.log(foo())`
		},
		// named
		{
			fixture: `
			console.log(foo())
			export function foo() {}`,
			expected: `
			export const foo = uff(function foo() {}, '/file.js-_foo')
			console.log(foo())`
		}
	]
}

describe('function declaration hoisting', () => {
	for (const [suiteName, suiteFixtures] of Object.entries(functionHoistingFixture)) {
		it(suiteName, () => {
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
