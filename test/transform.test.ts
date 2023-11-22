import { describe, expect, it } from 'vitest'
import { flytrapTransformUff } from '../src/transform/index'
import { deriveAnonymousFunctionName } from '../src/core/util'
import {
	addMissingFlytrapImports,
	findStartingIndex,
	getRequiredExportsForCapture
} from '../src/transform/imports'
import MagicString from 'magic-string'
import { FLYTRAP_PACKAGE_NAME } from '../src/core/config'
import { loadConfig } from '../src/transform/config'
import { parseScriptTags } from '../src/transform/parseScriptTags'
import { unpluginOptions } from '../src/transform'

const jsxFixture = `
export function HelloWorld({ children }: any) {
	return <h1>{children}</h1>
}
`
const jsxFixtureTarget = `
export const HelloWorld = uff(function HelloWorld({ children }: any) {
	return <h1>{children}</h1>
}, '/file.js-_HelloWorld');
`

describe('useFlytrapFunction transform', () => {
	it('transforms (J|T)SX', () => {
		expect(transform(jsxFixture)).toStrictEqual(toOneLine(jsxFixtureTarget))
	})

	it('transforms arrow function expressions', () => {
		expect(transform('() => {}')).toStrictEqual(
			toOneLine(toOneLine(`uff(() => {}, '/file.js-_anonymous')`))
		)
		expect(transform('async () => {}')).toStrictEqual(
			toOneLine(`uff(async () => {}, '/file.js-_anonymous')`)
		)

		expect(transform(`const hello = () => {}`)).toStrictEqual(
			toOneLine(`const hello = uff(() => {}, '/file.js-_hello')`)
		)
	})

	it('transforms function declarations', async () => {
		expect(transform('function hello() {}')).toStrictEqual(
			toOneLine(`const hello = uff(function hello() {}, '/file.js-_hello');`)
		)
		expect(transform('async function hello() {}')).toStrictEqual(
			toOneLine(`const hello = uff(async function hello() {}, '/file.js-_hello');`)
		)
	})

	it('transforms function expressions', async () => {
		expect(transform('const hello = function() {}')).toStrictEqual(
			toOneLine(`const hello = uff(function() {}, '/file.js-_hello')`)
		)
		expect(transform('const hello = async function() {}')).toStrictEqual(
			toOneLine(`const hello = uff(async function() {}, '/file.js-_hello')`)
		)
	})

	it('deeply transforms arguments', async () => {
		const objExprCode = `const x = {
			hello: () => {},
			world: () => {},
		}`
		const deepObjExprCode = `const x = { hello: { world: () => {} } }`
		const arrayCode = `[() => {}]`

		expect(transform(objExprCode)).toStrictEqual(
			toOneLine(`const x = {
			hello: uff(() => {}, '/file.js-_hello'),
			world: uff(() => {}, '/file.js-_world')
		}`)
		)
		expect(transform(deepObjExprCode)).toStrictEqual(
			toOneLine(`const x = { hello: { world: uff(() => {}, '/file.js-_world') } }`)
		)
		expect(transform(arrayCode)).toStrictEqual(toOneLine(`[uff(() => {}, '/file.js-_anonymous')]`))
	})

	it('generates function IDs based on location in the AST', () => {
		expect(transform(`function helloWorld() {}`)).toStrictEqual(
			toOneLine(
				`
			const helloWorld = uff(function helloWorld() {
	
			}, '/file.js-_helloWorld');
			`
			)
		)

		// Works inside scopes
		const scopeFixture = `
		{
			function helloWorld() {}
		}
		{
			function helloWorld() {}
		}
		`
		expect(transform(scopeFixture)).toStrictEqual(
			toOneLine(
				`
			{
				const helloWorld = uff(function helloWorld() {
	
				}, '/file.js-_helloWorld');
			}
			{
				const helloWorld = uff(function helloWorld() {
	
				}, '/file.js-_helloWorld2');
			}
			`
			)
		)
	})

	it('generates unique IDs for function definitions based on AST', () => {
		const someFixture = `
		;(() => {})

		;(() => {});
		`

		expect(transform(someFixture)).toStrictEqual(
			toOneLine(`
			uff(() => {}, '/file.js-_anonymous');

			uff(() => {}, '/file.js-_anonymous2');
			`)
		)
	})
})

it.skip('derives anonymous function names', () => {
	const usedAnonymousFunctionNames: string[] = []

	// No scopes
	const s1 = deriveAnonymousFunctionName([], usedAnonymousFunctionNames)
	usedAnonymousFunctionNames.push(s1)
	expect(s1).toBe('anonymous-1')

	const s2 = deriveAnonymousFunctionName([], usedAnonymousFunctionNames)
	usedAnonymousFunctionNames.push(s2)
	expect(s2).toBe('anonymous-2')

	// With scopes
	const s3 = deriveAnonymousFunctionName(['Scope1'], usedAnonymousFunctionNames)
	usedAnonymousFunctionNames.push(s3)
	expect(s3).toBe('Scope1/anonymous-1')

	// Inside BlockStatement
	const s4 = deriveAnonymousFunctionName(['Scope1', 'BlockStatement'], usedAnonymousFunctionNames)
	usedAnonymousFunctionNames.push(s4)
	expect(s4).toBe('Scope1-BlockStatement/anonymous-1')

	// Back to Scope1
	const s5 = deriveAnonymousFunctionName(['Scope1'], usedAnonymousFunctionNames)
	usedAnonymousFunctionNames.push(s5)
	expect(s5).toBe('Scope1/anonymous-2')
})

it.skip('wraps functions with scopes', () => {
	const scopeFixture = `
	;() => {};
	;() => {};

	function SomeComponent() {
		;() => {};
		{
			;() => {};
		}
		;() => {};
	}
	`

	const scopeFixtureWithArrowFunction = `
	const SomeComponent = () => {
		const { data } = useSession()
	}
	`
	expect(transform(scopeFixtureWithArrowFunction)).toStrictEqual(
		toOneLine(
			`const SomeComponent = uff(() => {
				const { data } = ufc(useSession, { id: '/file.js-call-_useSession', args: [], name: 'useSession' })
			}, '/file.js-_SomeComponent')`
		)
	)

	expect(transform(scopeFixture)).toStrictEqual(
		toOneLine(`
		uff(() => {}, { name: 'anonymous-1', filePath: '/file.js', lineNumber: 2, scopes: [] });
		uff(() => {}, { name: 'anonymous-2', filePath: '/file.js', lineNumber: 3, scopes: [] });

		const SomeComponent = uff(function SomeComponent() {
			;uff(() => {}, { name: 'SomeComponent/anonymous-1', filePath: '/file.js', lineNumber: 6, scopes: ['SomeComponent'] });
			{
				;uff(() => {}, { name: 'SomeComponent-BlockStatement/anonymous-1', filePath: '/file.js', lineNumber: 8, scopes: ['SomeComponent', 'BlockStatement'] });
			}
			;uff(() => {}, { name: 'SomeComponent/anonymous-2', filePath: '/file.js', lineNumber: 10, scopes: ['SomeComponent'] });
		}, { name: 'SomeComponent', filePath: '/file.js', lineNumber: 5, scopes: [] });
		`)
	)
})

it('transforms default exports', () => {
	expect(
		transform(`
	export default function getAllConfigs() {}
	`)
	).toStrictEqual(
		toOneLine(`
	export default uff(function getAllConfigs() {}, '/file.js-_getAllConfigs');
	`)
	)

	// Anonymous default function
	expect(
		transform(`
	export default function() {}
	`)
	).toStrictEqual(
		toOneLine(`
	export default uff(function() {}, '/file.js-_anonymous');
	`)
	)

	expect(
		transform(`
	export default {}
	`)
	).toStrictEqual(
		toOneLine(`
	export default {}
	`)
	)
})

it('finds correct place to add code to (after directives)', () => {
	const withoutDirective = `
	function foo() {}
	`
	const withDirective = `
	'use client'
	function foo() {}
	`
	const withDirective2 = `
	// comment
	'use client'
	function foo() {}
	`

	const withIncorrectlyPlacedDirective = `
	function foo() {}
	'use client'
	`

	const withIncorrectlyPlacedDirective2 = `
	function foo() {
		'use client'
	}
	`

	expect(findStartingIndex(new MagicString(withoutDirective))).toBe(0)
	// // incorrectly placed
	expect(findStartingIndex(new MagicString(withIncorrectlyPlacedDirective))).toBe(0)
	expect(findStartingIndex(new MagicString(withIncorrectlyPlacedDirective2))).toBe(0)
	// correctly placed
	expect(findStartingIndex(new MagicString(withDirective))).toBe(14)
	expect(findStartingIndex(new MagicString(withDirective2))).toBe(26)
})

// function flytrapImport

/*const getFlytrapImports = () => {
	return `import { ${getCoreExports().join(', ')} } from '${FLYTRAP_PACKAGE_NAME}'`
}*/

const getFlytrapRequiredImports = () => {
	return `import { ${getRequiredExportsForCapture().join(', ')} } from '${FLYTRAP_PACKAGE_NAME}';`
}

describe('addMissingImports transform', () => {
	it('adds imports after "use ..." directives', () => {
		const useClientFixture = `
		'use client';

		function foo() {}
		`

		const useClientFixture2 = `
		// comment
		'use client';

		function foo() {}
		`

		const wrongUseClientFixture = `
		function foo() {}
		'use client';
		`

		expect(
			toOneLine(addMissingFlytrapImports(new MagicString(useClientFixture), '/file.js').toString())
		).toBe(
			toOneLine(`
			'use client';

			${getFlytrapRequiredImports()}

			function foo() {}
			`)
		)

		// use client fixture 2
		expect(
			toOneLine(addMissingFlytrapImports(new MagicString(useClientFixture2), '/file.js').toString())
		).toBe(
			toOneLine(`
			// comment
			'use client';

			${getFlytrapRequiredImports()}

			function foo() {}
			`)
		)

		// wrong use fixture
		expect(
			toOneLine(
				addMissingFlytrapImports(new MagicString(wrongUseClientFixture), '/file.js').toString()
			)
		).toBe(
			toOneLine(`
			${getFlytrapRequiredImports()}
			function foo() {}
			'use client';
			`)
		)
	})

	it('adds only needed imports', () => {
		const fixture = `import { capture } from 'useflytrap';`
		const transformed = addMissingFlytrapImports(new MagicString(fixture), '/file.js')
		expect(toOneLine(transformed.toString())).toEqual(
			toOneLine(`
			${getFlytrapRequiredImports()}
			import { capture } from 'useflytrap';
			`)
		)

		const fixtureWithRequiredImports = `
		import { capture, ufc } from 'useflytrap';
		`
		const transformedWithRequired = addMissingFlytrapImports(
			new MagicString(fixtureWithRequiredImports),
			'/file.js'
		)
		expect(toOneLine(transformedWithRequired.toString())).toEqual(
			toOneLine(`
			import { uff, setFlytrapConfig } from 'useflytrap';
			import { capture, ufc } from 'useflytrap';
			`)
		)
	})
})

describe('uff(Async) transform', () => {
	it('transforms sync functions', () => {
		expect(transform('const a = listUsers()')).toStrictEqual(
			toOneLine(
				`const a = ufc(listUsers, { id: '/file.js-call-_listUsers', args: [], name: 'listUsers' })`
			)
		)
		expect(transform('const a = await listUsers()')).toStrictEqual(
			toOneLine(
				`const a = await ufc(listUsers, { id: '/file.js-call-_listUsers', args: [], name: 'listUsers' })`
			)
		)

		expect(
			transform(`
		console.log('')
		console.log('hello world')`)
		).toStrictEqual(
			toOneLine(
				`
			ufc(console, { id: '/file.js-call-_log', args: [''], name: 'log' })
			ufc(console, { id: '/file.js-call-_log2', args: ['hello world'], name: 'log' })
			`
			)
		)
	})

	it('transforms default exports', () => {
		const defaultExportFixture = `
		import NextAuth from "next-auth";
		import { authOptions } from "@/server/auth";
		export default NextAuth(authOptions);
		`

		expect(transform(defaultExportFixture)).toStrictEqual(
			toOneLine(`
			import NextAuth from "next-auth";
			import { authOptions } from "@/server/auth";
			export default ufc(NextAuth, { id: '/file.js-call-_NextAuth', args: [authOptions], name: 'NextAuth' });
			`)
		)
	})

	it('transforms arguments', () => {
		expect(transform('const a = listUsers(1, 2);')).toStrictEqual(
			toOneLine(
				`const a = ufc(listUsers, { id: '/file.js-call-_listUsers', args: [1, 2], name: 'listUsers' });`
			)
		)
		expect(transform('const a = await listUsers(1, 2);')).toStrictEqual(
			toOneLine(
				`const a = await ufc(listUsers, { id: '/file.js-call-_listUsers', args: [1, 2], name: 'listUsers' });`
			)
		)
	})

	it('transforms namespaced function calls', () => {
		expect(transform(`supabase.from('Capture')`)).toStrictEqual(
			toOneLine(
				`
				ufc(supabase, {
					id: '/file.js-call-_from',
					args: ['Capture'],
					name: 'from'
				})
				`
			)
		)

		expect(
			transform(`const { data, error } = await supabase.from('Capture').select('*')`)
		).toStrictEqual(
			toOneLine(`
				const { data, error } = await ufc(ufc(supabase, {
					id: '/file.js-call-_from',
					args: ['Capture'],
					name: 'from'
				}), {
					id: '/file.js-call-_select',
					args: ['*'],
					name: 'select'
				})
				`)
		)
	})

	it('transforms function calls with function definition arguments', () => {
		const fixture = `const a = listUsers({ fetch: (endpoint) => {} })`

		expect(transform(fixture).split('\n').join('')).toStrictEqual(
			toOneLine(
				`const a = ufc(listUsers, { id: '/file.js-call-_listUsers', args: [{ fetch: uff(endpoint => {}, '/file.js-_fetch') }], name: 'listUsers' })`
			)
		)
	})

	it('generates unique IDs for function calls based on AST', () => {
		expect(transform(`listUsers()`)).toStrictEqual(
			toOneLine(`
			ufc(listUsers, { id: '/file.js-call-_listUsers', args:[], name:'listUsers' })
			`)
		)
		expect(
			transform(`
		listUsers()
		listUsers()
		`)
		).toStrictEqual(
			toOneLine(`
			ufc(listUsers, {id: '/file.js-call-_listUsers',args:[],name:'listUsers' })
			ufc(listUsers, {id: '/file.js-call-_listUsers2',args:[],name:'listUsers' })
		`)
		)

		// With scopes
		expect(
			transform(`
			listUsers()
			listUsers()
			function helloWorld() {
				listUsers()
				listUsers()
			}
			`)
		).toStrictEqual(
			toOneLine(`
			ufc(listUsers, {
				id: '/file.js-call-_listUsers',
				args: [],
				name: 'listUsers'
		})
		ufc(listUsers, {
				id: '/file.js-call-_listUsers2',
				args: [],
				name: 'listUsers'
		})

		const helloWorld = uff(function helloWorld() {
					ufc(listUsers, {
						id: '/file.js-call-_helloWorldListUsers',
						args: [],
						name: 'listUsers'
					})
					ufc(listUsers, {
						id: '/file.js-call-_helloWorldListUsers2',
						args: [],
						name: 'listUsers'
					})
				}, '/file.js-_helloWorld');
		`)
		)
	})

	it('takes the function ID of wrapping `useFlytrapFunction` if it exists', () => {
		const fixture = `
		const helloWorld = uff(function helloWorld() {
			console.log('hello world')
		}, '/file.js-_helloWorld')
		`

		expect(transform(fixture)).toStrictEqual(
			toOneLine(`
		const helloWorld = uff(function helloWorld() {
			ufc(console, { id: '/file.js-call-_helloWorldLog', args: ['hello world'], name: 'log' })
		}, '/file.js-_helloWorld')
		`)
		)
	})
})

it('loads config', async () => {
	const config = await loadConfig()

	expect(config).toEqual({
		projectId: 'flytrap',
		publicApiKey: 'pk_some_api_key',
		secretApiKey: 'sk_some_secret_key',
		mode: 'capture'
	})
})

describe('classes', () => {
	it('doesnt transform class functions', () => {
		const classWithFunctions = `
		class Foo {
			constructor() {}
		
			helloWorld() {}
		}`

		expect(transform(classWithFunctions)).toEqual(`classFoo{constructor(){}helloWorld(){}}`)
	})
})

const superFixture = `
class Foo extends Bar {
	constructor() {
		super()
	}
}
`

it('doesnt transform reserved words', () => {
	expect(transform(superFixture)).toEqual(`classFooextendsBar{constructor(){super()}}`)
	expect(transform(`import("foo")`)).toEqual(`import("foo")`)
})

it('transforms .vue files', async () => {
	const fixture = `
	<script setup>
	function foo() {
	}
	</script>

	<template>
		<div>
			hello world
		</div>
	</template>
	`

	// @ts-expect-error
	expect(toOneLine((await unpluginOptions.transform(fixture, '/app.vue')).code)).toEqual(
		toOneLine(`
			<script setup>
			${getFlytrapRequiredImports()}

			const foo = uff(function foo() {
			}, '/app.vue-_foo');
      </script>

      <template>
        <div>
          hello world
        </div>
      </template>
		`)
	)
})

it('parses script tags from .vue & .svelte files', () => {
	const fixtures = [
		{
			code: `<script>foo()</script>`,
			start: 8,
			end: 13,
			content: 'foo()'
		},
		{
			code: `<script >foo()</script>`,
			start: 9,
			end: 14,
			content: 'foo()'
		},
		{
			code: `<script	>foo()</script>`,
			start: 9,
			end: 14,
			content: 'foo()'
		},
		{
			code: `<script>foo()</script	>`,
			start: 8,
			end: 13,
			content: 'foo()'
		},
		{
			code: `<script	>foo()</script	>`,
			start: 9,
			end: 14,
			content: 'foo()'
		},

		// Vue specific
		{
			code: `<script setup>foo()</script>`,
			start: 14,
			end: 19,
			content: 'foo()'
		},
		// Svelte
		{
			code: `<script lang="ts">foo()</script>`,
			start: 18,
			end: 23,
			content: 'foo()'
		},
		{
			code: `<script	lang="ts">foo()</script>`,
			start: 18,
			end: 23,
			content: 'foo()'
		},
		{
			code: `<script	lang="ts" context="module">foo()</script>`,
			start: 35,
			end: 40,
			content: 'foo()'
		}
	]

	for (let i = 0; i < fixtures.length; i++) {
		expect(parseScriptTags(fixtures[i].code)).toEqual([
			{
				start: fixtures[i].start,
				end: fixtures[i].end,
				content: fixtures[i].content
			}
		])
	}

	// Multiple  script tags
	expect(
		parseScriptTags(`
	<script>foo()</script>
	<h1>hello world</h1>
	<script>bar()</script>
	`)
	).toEqual([
		{
			start: 10,
			end: 15,
			content: 'foo()'
		},
		{
			start: 56,
			end: 61,
			content: 'bar()'
		}
	])
})

export function toOneLine(code: string) {
	return code.split('\n').join('').replace(/\s+/g, '').replaceAll("'", '"').replaceAll(';', '')
}

export function transform(code: string) {
	const { code: transformedCode } = flytrapTransformUff(code, '/file.js')
	return toOneLine(transformedCode)
}
