import { describe, expect, it } from 'vitest'
import { flytrapTransformArtifacts } from '../src/transform/index'
import { deriveAnonymousFunctionName } from '../src/core/util'
import {
	addMissingFlytrapImports,
	findStartingIndex,
	getCoreExports
} from '../src/transform/imports'
import MagicString from 'magic-string'
import { FLYTRAP_PACKAGE_NAME } from '../src/core/config'

const jsxFixture = `
export function HelloWorld({ children }: any) {
	return (
		<h1>{children}</h1>
	)
}
`
const jsxFixtureTarget = `
export const HelloWorld = useFlytrapFunction(function HelloWorld({ children }: any) {
	return (
		<h1>{children}</h1>
	)
}, { id: '/file.js-_HelloWorld' });
`

describe('useFlytrapFunction transform', () => {
	it('transforms (J|T)SX', () => {
		expect(transform(jsxFixture)).toStrictEqual(toOneLine(jsxFixtureTarget))
	})

	it('transforms arrow function expressions', () => {
		expect(transform('() => {}')).toStrictEqual(
			toOneLine(toOneLine(`useFlytrapFunction(() => {}, { id: '/file.js-_anonymous' })`))
		)
		expect(transform('async () => {}')).toStrictEqual(
			toOneLine(`useFlytrapFunction(async () => {}, { id: '/file.js-_anonymous' })`)
		)

		expect(transform(`const hello = () => {}`)).toStrictEqual(
			toOneLine(`const hello = useFlytrapFunction(() => {}, { id: '/file.js-_hello' })`)
		)
	})

	it('transforms function declarations', async () => {
		expect(transform('function hello() {}')).toStrictEqual(
			toOneLine(`const hello = useFlytrapFunction(function hello() {}, { id: '/file.js-_hello' });`)
		)
		expect(transform('async function hello() {}')).toStrictEqual(
			toOneLine(
				`const hello = useFlytrapFunction(async function hello() {}, { id: '/file.js-_hello' });`
			)
		)
	})

	it('transforms function expressions', async () => {
		expect(transform('const hello = function() {}')).toStrictEqual(
			toOneLine(`const hello = useFlytrapFunction(function() {}, { id: '/file.js-_hello' })`)
		)
		expect(transform('const hello = async function() {}')).toStrictEqual(
			toOneLine(`const hello = useFlytrapFunction(async function() {}, { id: '/file.js-_hello' })`)
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
			hello: useFlytrapFunction(() => {}, { id: '/file.js-_hello' }),
			world: useFlytrapFunction(() => {}, { id: '/file.js-_world' }),
		}`)
		)
		expect(transform(deepObjExprCode)).toStrictEqual(
			toOneLine(
				`const x = { hello: { world: useFlytrapFunction(() => {}, { id: '/file.js-_world' }) } }`
			)
		)
		expect(transform(arrayCode)).toStrictEqual(
			toOneLine(`[useFlytrapFunction(() => {}, { id: '/file.js-_anonymous' })]`)
		)
	})

	it('generates function IDs based on location in the AST', () => {
		expect(transform(`function helloWorld() {}`)).toStrictEqual(
			toOneLine(
				`
			const helloWorld = useFlytrapFunction(function helloWorld() {
	
			}, { id: '/file.js-_helloWorld' });
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
				const helloWorld = useFlytrapFunction(function helloWorld() {
	
				}, { id: '/file.js-_helloWorld' });
			}
			{
				const helloWorld = useFlytrapFunction(function helloWorld() {
	
				}, { id: '/file.js-_helloWorld2' });
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
			;(useFlytrapFunction((() => {}), {
				id: '/file.js-_anonymous'
			}))

			;(useFlytrapFunction((() => {}), {
				id: '/file.js-_anonymous2'
			}));
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
			`const SomeComponent = useFlytrapFunction(() => {
				const { data } = useFlytrapCall(useSession, { id: '/file.js-call-_useSession', args: [], name: 'useSession' })
			}, { id: '/file.js-_SomeComponent' })`
		)
	)

	expect(transform(scopeFixture)).toStrictEqual(
		toOneLine(`
		useFlytrapFunction(() => {}, { name: 'anonymous-1', filePath: '/file.js', lineNumber: 2, scopes: [] });
		useFlytrapFunction(() => {}, { name: 'anonymous-2', filePath: '/file.js', lineNumber: 3, scopes: [] });

		const SomeComponent = useFlytrapFunction(function SomeComponent() {
			;useFlytrapFunction(() => {}, { name: 'SomeComponent/anonymous-1', filePath: '/file.js', lineNumber: 6, scopes: ['SomeComponent'] });
			{
				;useFlytrapFunction(() => {}, { name: 'SomeComponent-BlockStatement/anonymous-1', filePath: '/file.js', lineNumber: 8, scopes: ['SomeComponent', 'BlockStatement'] });
			}
			;useFlytrapFunction(() => {}, { name: 'SomeComponent/anonymous-2', filePath: '/file.js', lineNumber: 10, scopes: ['SomeComponent'] });
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
	export default useFlytrapFunction(function getAllConfigs() {}, {
		id: '/file.js-_getAllConfigs'
	});
	`)
	)

	// Anonymous default function
	expect(
		transform(`
	export default function() {}
	`)
	).toStrictEqual(
		toOneLine(`
	export default useFlytrapFunction(function() {}, {
		id: '/file.js-_anonymous'
	});
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

const getFlytrapImports = () => {
	return `import { ${getCoreExports().join(', ')} } from '${FLYTRAP_PACKAGE_NAME}'`
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

		expect(toOneLine(addMissingFlytrapImports(new MagicString(useClientFixture)).toString())).toBe(
			toOneLine(`
			'use client';

			${getFlytrapImports()}

			function foo() {}
			`)
		)

		// use client fixture 2
		expect(toOneLine(addMissingFlytrapImports(new MagicString(useClientFixture2)).toString())).toBe(
			toOneLine(`
			// comment
			'use client';

			${getFlytrapImports()}

			function foo() {}
			`)
		)

		// wrong use fixture
		expect(
			toOneLine(addMissingFlytrapImports(new MagicString(wrongUseClientFixture)).toString())
		).toBe(
			toOneLine(`
			${getFlytrapImports()}
			function foo() {}
			'use client';
			`)
		)
	})

	it.todo('adds only needed imports')
})

describe('useFlytrapCall(Async) transform', () => {
	it('transforms sync functions', () => {
		expect(transform('const a = listUsers()')).toStrictEqual(
			toOneLine(
				`const a = useFlytrapCall(listUsers, { id: '/file.js-call-_listUsers', args: [], name: 'listUsers' })`
			)
		)
		expect(transform('const a = await listUsers()')).toStrictEqual(
			toOneLine(
				`const a = await useFlytrapCallAsync(listUsers, { id: '/file.js-call-_listUsers', args: [], name: 'listUsers' })`
			)
		)

		expect(
			transform(`
		console.log('')
		console.log('hello world')`)
		).toStrictEqual(
			toOneLine(
				`
			useFlytrapCall(console, { id: '/file.js-call-_log', args: [''], name: 'log' })
			useFlytrapCall(console, { id: '/file.js-call-_log2', args: ['hello world'], name: 'log' })
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
			export default useFlytrapCall(NextAuth, { id: '/file.js-call-_NextAuth', args: [authOptions], name: 'NextAuth' });
			`)
		)
	})

	it('transforms arguments', () => {
		expect(transform('const a = listUsers(1, 2);')).toStrictEqual(
			toOneLine(
				`const a = useFlytrapCall(listUsers, { id: '/file.js-call-_listUsers', args: [1, 2], name: 'listUsers' });`
			)
		)
		expect(transform('const a = await listUsers(1, 2);')).toStrictEqual(
			toOneLine(
				`const a = await useFlytrapCallAsync(listUsers, { id: '/file.js-call-_listUsers', args: [1, 2], name: 'listUsers' });`
			)
		)
	})

	it('transforms namespaced function calls', () => {
		expect(transform(`supabase.from('Capture')`)).toStrictEqual(
			toOneLine(
				`
				useFlytrapCall(supabase, {
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
				const { data, error } = await useFlytrapCallAsync(useFlytrapCall(supabase, {
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
				`const a = useFlytrapCall(listUsers, { id: '/file.js-call-_listUsers', args: [{ fetch: useFlytrapFunction(endpoint => {}, { id: '/file.js-_fetch' }) }], name: 'listUsers' })`
			)
		)
	})

	it('generates unique IDs for function calls based on AST', () => {
		expect(transform(`listUsers()`)).toStrictEqual(
			toOneLine(`
			useFlytrapCall(listUsers, { id: '/file.js-call-_listUsers', args:[], name:'listUsers' })
			`)
		)
		expect(
			transform(`
		listUsers()
		listUsers()
		`)
		).toStrictEqual(
			toOneLine(`
			useFlytrapCall(listUsers, {id: '/file.js-call-_listUsers',args:[],name:'listUsers' })
			useFlytrapCall(listUsers, {id: '/file.js-call-_listUsers2',args:[],name:'listUsers' })
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
			useFlytrapCall(listUsers, {
				id: '/file.js-call-_listUsers',
				args: [],
				name: 'listUsers'
		})
		useFlytrapCall(listUsers, {
				id: '/file.js-call-_listUsers2',
				args: [],
				name: 'listUsers'
		})

		const helloWorld = useFlytrapFunction(function helloWorld() {
					useFlytrapCall(listUsers, {
						id: '/file.js-call-_helloWorldListUsers',
						args: [],
						name: 'listUsers'
					})
					useFlytrapCall(listUsers, {
						id: '/file.js-call-_helloWorldListUsers2',
						args: [],
						name: 'listUsers'
					})
				}, {
				id: '/file.js-_helloWorld'
		});
		`)
		)
	})

	it('takes the function ID of wrapping `useFlytrapFunction` if it exists', () => {
		const fixture = `
		const helloWorld = useFlytrapFunction(function helloWorld() {
			console.log('hello world')
		}, { id: '/file.js-_helloWorld' })
		`

		expect(transform(fixture)).toStrictEqual(
			toOneLine(`
		const helloWorld = useFlytrapFunction(function helloWorld() {
			useFlytrapCall(console, { id: '/file.js-call-_helloWorldLog', args: ['hello world'], name: 'log' })
		}, { id: '/file.js-_helloWorld' })
		`)
		)
	})
})

export function toOneLine(code: string) {
	return code.split('\n').join('').replace(/\s+/g, '')
}

export function transform(code: string) {
	const { code: transformedCode } = flytrapTransformArtifacts(code, '/file.js')
	return toOneLine(transformedCode)
}
