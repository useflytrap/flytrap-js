import { describe, expect, it } from 'vitest'
import { flytrapTransform } from '../src/transform/index'
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
}, { id: '/file.js-HelloWorld', name: 'HelloWorld', filePath: '/file.js', lineNumber: 2, scopes: [] });
`

describe('useFlytrapFunction transform', () => {
	it('transforms (J|T)SX', () => {
		expect(transform(jsxFixture)).toStrictEqual(toOneLine(jsxFixtureTarget))
	})

	it('transforms arrow function expressions', () => {
		expect(transform('() => {}')).toStrictEqual(
			toOneLine(
				toOneLine(
					`useFlytrapFunction(() => {}, { id: '/file.js-anonymous', name: 'anonymous', filePath: '/file.js', lineNumber: 1, scopes: [] })`
				)
			)
		)
		expect(transform('async () => {}')).toStrictEqual(
			toOneLine(
				`useFlytrapFunction(async () => {}, { id: '/file.js-anonymous', name: 'anonymous', filePath: '/file.js', lineNumber: 1, scopes: [] })`
			)
		)

		expect(transform(`const hello = () => {}`)).toStrictEqual(
			toOneLine(
				`const hello = useFlytrapFunction(() => {}, { id: '/file.js-hello', name: 'hello', filePath: '/file.js', lineNumber: 1, scopes: [] })`
			)
		)
	})

	it('transforms function declarations', async () => {
		expect(transform('function hello() {}')).toStrictEqual(
			toOneLine(
				`const hello = useFlytrapFunction(function hello() {}, { id: '/file.js-hello', name: 'hello', filePath: '/file.js', lineNumber: 1, scopes: [] });`
			)
		)
		expect(transform('async function hello() {}')).toStrictEqual(
			toOneLine(
				`const hello = useFlytrapFunction(async function hello() {}, { id: '/file.js-hello', name: 'hello', filePath: '/file.js', lineNumber: 1, scopes: [] });`
			)
		)
	})

	it('transforms function expressions', async () => {
		expect(transform('const hello = function() {}')).toStrictEqual(
			toOneLine(
				`const hello = useFlytrapFunction(function() {}, { id: '/file.js-hello', name: 'hello', filePath: '/file.js', lineNumber: 1, scopes: [] })`
			)
		)
		expect(transform('const hello = async function() {}')).toStrictEqual(
			toOneLine(
				`const hello = useFlytrapFunction(async function() {}, { id: '/file.js-hello', name: 'hello', filePath: '/file.js', lineNumber: 1, scopes: [] })`
			)
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
			hello: useFlytrapFunction(() => {}, { id: '/file.js-hello', name: 'hello', filePath: '/file.js', lineNumber: 2, scopes: [] }),
			world: useFlytrapFunction(() => {}, { id: '/file.js-world', name: 'world', filePath: '/file.js', lineNumber: 3, scopes: [] }),
		}`)
		)
		expect(transform(deepObjExprCode)).toStrictEqual(
			toOneLine(
				`const x = { hello: { world: useFlytrapFunction(() => {}, { id: '/file.js-world', name: 'world', filePath: '/file.js', lineNumber: 1, scopes: [] }) } }`
			)
		)
		expect(transform(arrayCode)).toStrictEqual(
			toOneLine(
				`[useFlytrapFunction(() => {}, { id: '/file.js-anonymous', name: 'anonymous', filePath: '/file.js', lineNumber: 1, scopes: [] })]`
			)
		)
	})

	it('generates function IDs based on location in the AST', () => {
		expect(transform(`function helloWorld() {}`)).toStrictEqual(
			toOneLine(
				`
			const helloWorld = useFlytrapFunction(function helloWorld() {
	
			}, { id: '/file.js-helloWorld', name: 'helloWorld', filePath: '/file.js', lineNumber: 1, scopes: [] });
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
	
				}, { id: '/file.js-BlockStatement-helloWorld', name: 'helloWorld', filePath: '/file.js', lineNumber: 3, scopes: ['BlockStatement'] });
			}
			{
				const helloWorld = useFlytrapFunction(function helloWorld() {
	
				}, { id: '/file.js-BlockStatement-helloWorld-2', name: 'helloWorld', filePath: '/file.js', lineNumber: 6, scopes: ['BlockStatement'] });
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
				id: '/file.js-anonymous',
				name: 'anonymous',
				filePath: '/file.js',
				lineNumber: 2,
				scopes: []
			}))

			;(useFlytrapFunction((() => {}), {
				id: '/file.js-anonymous-2',
				name: 'anonymous',
				filePath: '/file.js',
				lineNumber: 4,
				scopes: []
			}));
			`)
		)
	})
})

it.skip('derives anonymous function names', () => {
	/* Testing a following setup:
	;() => {};
	;() => {};

	function Scope1() {
		;() => {};
		{
			;() => {};
		}
		;() => {};
	}
	`;

	*/

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
				const { data } = useFlytrapCall(useSession, { args: [], name: 'useSession', filePath: '/file.js', lineNumber: 3, scopes: ['SomeComponent'] })
			}, { name: 'SomeComponent', filePath: '/file.js', lineNumber: 2, scopes: [] })`
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

/* const x = function () {

} */

it('transforms default exports', () => {
	expect(
		transform(`
	export default function getAllConfigs() {}
	`)
	).toStrictEqual(
		toOneLine(`
	export default useFlytrapFunction(function getAllConfigs() {}, {
		id: '/file.js-getAllConfigs',
		name: 'getAllConfigs',
		filePath: '/file.js',
		lineNumber: 2,
		scopes: []
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
		id: '/file.js-anonymous',
		name: 'anonymous',
		filePath: '/file.js',
		lineNumber: 2,
		scopes: []
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
				`const a = useFlytrapCall(listUsers, { id: '/file.js-listUsers', args: [],  name: 'listUsers', filePath: '/file.js', lineNumber: 1, scopes: [] })`
			)
		)
		expect(transform('const a = await listUsers()')).toStrictEqual(
			toOneLine(
				`const a = await useFlytrapCallAsync(listUsers, { id: '/file.js-listUsers', args: [],  name: 'listUsers',  filePath: '/file.js', lineNumber: 1, scopes: [] })`
			)
		)

		expect(
			transform(`
		console.log('')
		console.log('hello world')`)
		).toStrictEqual(
			toOneLine(
				`
			useFlytrapCall(console, { id: '/file.js-console.log', args: [''], name: 'log', filePath: '/file.js', lineNumber: 2, scopes: [] })
			useFlytrapCall(console, { id: '/file.js-console.log-2', args: ['hello world'], name: 'log', filePath: '/file.js', lineNumber: 3, scopes: [] })
			`
			)
		)
	})

	/*it('correct params', () => {
		expect(transform('const a = await listUsers(/* should ignore comments)')).toStrictEqual(
			toOneLine(
				`const a = await useFlytrapCallAsync(listUsers, {  args: [], params: '',  name: 'listUsers',  filePath: '/file.js', lineNumber: 1, scopes: [] })`
			)
		)
	})*/

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
			export default useFlytrapCall(NextAuth, { id: '/file.js-NextAuth', args: [authOptions], name: 'NextAuth', filePath: '/file.js', lineNumber: 4, scopes: [] });
			`)
		)
	})

	it('transforms arguments', () => {
		expect(transform('const a = listUsers(1, 2);')).toStrictEqual(
			toOneLine(
				`const a = useFlytrapCall(listUsers, { id: '/file.js-listUsers', args: [1, 2], name: 'listUsers', filePath: '/file.js', lineNumber: 1, scopes: [] });`
			)
		)
		expect(transform('const a = await listUsers(1, 2);')).toStrictEqual(
			toOneLine(
				`const a = await useFlytrapCallAsync(listUsers, { id: '/file.js-listUsers', args: [1, 2], name: 'listUsers', filePath: '/file.js', lineNumber: 1, scopes: [] });`
			)
		)
	})

	it('transforms namespaced function calls', () => {
		expect(transform(`supabase.from('Capture')`)).toStrictEqual(
			toOneLine(
				`
				useFlytrapCall(supabase, {
					id: '/file.js-supabase.from',
					args: ['Capture'],
					name: 'from',
					filePath: '/file.js',
					lineNumber: 1,
					scopes: []
				})
				`
			)
		)

		expect(
			transform(`const { data, error } = await supabase.from('Capture').select('*')`)
		).toStrictEqual(
			toOneLine(
				`
				const { data, error } = await useFlytrapCallAsync(useFlytrapCall(supabase, {
					id: '/file.js-supabase.from',
					args: ['Capture'],
					name: 'from',
					filePath: '/file.js',
					lineNumber: 1,
					scopes: []
				}), {
					id: '/file.js-(anonymous).select',
					args: ['*'],
					name: 'select',
					filePath: '/file.js',
					lineNumber: 1,
					scopes: []
				})
				`
			)
		)
	})

	it('transforms function calls with function definition arguments', () => {
		const fixture = `const a = listUsers({ fetch: (endpoint) => {} })`

		expect(transform(fixture).split('\n').join('')).toStrictEqual(
			toOneLine(
				`const a = useFlytrapCall(listUsers, { id: '/file.js-listUsers', args: [{ fetch: useFlytrapFunction(endpoint => {}, { id: '/file.js-fetch', name: 'fetch', filePath: '/file.js', lineNumber: 1, scopes: [] }) }],  name: 'listUsers', filePath: '/file.js', lineNumber: 1, scopes: [] })`
			)
		)
	})

	it('generates unique IDs for function calls based on AST', () => {
		expect(transform(`listUsers()`)).toStrictEqual(
			toOneLine(`
			useFlytrapCall(listUsers,{id: '/file.js-listUsers',args:[],name:'listUsers',filePath:'/file.js',lineNumber:1,scopes:[]})
		`)
		)
		expect(
			transform(`
		listUsers()
		listUsers()
		`)
		).toStrictEqual(
			toOneLine(`
			useFlytrapCall(listUsers,{id: '/file.js-listUsers',args:[],name:'listUsers',filePath:'/file.js',lineNumber:2,scopes:[]})
			useFlytrapCall(listUsers,{id: '/file.js-listUsers-2',args:[],name:'listUsers',filePath:'/file.js',lineNumber:3,scopes:[]})
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
				id: '/file.js-listUsers',
				args: [],
				name: 'listUsers',
				filePath: '/file.js',
				lineNumber: 2,
				scopes: []
		})
		useFlytrapCall(listUsers, {
				id: '/file.js-listUsers-2',
				args: [],
				name: 'listUsers',
				filePath: '/file.js',
				lineNumber: 3,
				scopes: []
		})

		const helloWorld = useFlytrapFunction(function helloWorld() {
					useFlytrapCall(listUsers, {
						functionId: '/file.js-helloWorld',
						id: '/file.js-helloWorld-listUsers',
						args: [],
						name: 'listUsers',
						filePath: '/file.js',
						lineNumber: 5,
						scopes: ['helloWorld']
					})
					useFlytrapCall(listUsers, {
						functionId: '/file.js-helloWorld',
						id: '/file.js-helloWorld-listUsers-2',
						args: [],
						name: 'listUsers',
						filePath: '/file.js',
						lineNumber: 6,
						scopes: ['helloWorld']
					})
				}, {
				id: '/file.js-helloWorld',
				name: 'helloWorld',
				filePath: '/file.js',
				lineNumber: 4,
				scopes: []
		});
		`)
		)
	})

	it('takes the function ID of wrapping `useFlytrapFunction` if it exists', () => {
		const fixture = `
		const helloWorld = useFlytrapFunction(function helloWorld() {
			console.log('hello world')
		}, { id: '/file.js-helloWorld', filePath: '/file.js', lineNumber: 2, scopes: [] })
		`

		expect(transform(fixture)).toStrictEqual(
			toOneLine(`
		const helloWorld = useFlytrapFunction(function helloWorld() {
			useFlytrapCall(console, { functionId: '/file.js-helloWorld', id: '/file.js-helloWorld-console.log', args: ['hello world'], name: 'log', filePath: '/file.js', lineNumber: 3, scopes: ['helloWorld'] })
		}, { id: '/file.js-helloWorld', filePath: '/file.js', lineNumber: 2, scopes: [] })
		`)
		)
	})
})

export function toOneLine(code: string) {
	return code.split('\n').join('').replace(/\s+/g, '')
}

export function transform(code: string) {
	const { code: transformedCode } = flytrapTransform(code, '/file.js')
	return toOneLine(transformedCode)
}
