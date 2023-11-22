import { flytrapTransformUff } from '../src/transform/index'
import { describe, expect, it } from 'vitest'

describe('useFlytrapFunction', () => {
	it('transforms (J|T)SX', () => {
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

		expect(transform(jsxFixture)).toEqual(toOneLine(jsxFixtureTarget))
	})

	it('transforms arrow function expressions', () => {
		expect(
			transform(`
		() => {}
		`)
		).toEqual(
			toOneLine(`
		uff(() => {}, '/file.js-_anonymous')
		`)
		)

		expect(
			transform(`
		async () => {}
		`)
		).toEqual(
			toOneLine(`
		uff(async () => {}, '/file.js-_anonymous')
		`)
		)

		expect(
			transform(`
		const hello = () => {}
		`)
		).toEqual(
			toOneLine(`
		const hello = uff(() => {}, '/file.js-_hello')
		`)
		)
	})

	it('transforms function declarations', () => {
		expect(
			transform(`
		function hello() {}
		`)
		).toEqual(
			toOneLine(`
		const hello = uff(function hello() {}, '/file.js-_hello');
		`)
		)

		expect(
			transform(`
		async function hello() {}
		`)
		).toEqual(
			toOneLine(`
		const hello = uff(async function hello() {}, '/file.js-_hello');
		`)
		)
	})

	it('transforms function expressions', () => {
		expect(
			transform(`
		const hello = function() {}
		`)
		).toEqual(
			toOneLine(`
		const hello = uff(function () {}, '/file.js-_hello')
		`)
		)

		expect(
			transform(`
		const hello = async function() {}
		`)
		).toEqual(
			toOneLine(`
		const hello = uff(async function() {}, '/file.js-_hello')
		`)
		)
	})

	it('transforms object functions', () => {
		expect(
			transform(`
		const x = {
			hello: () => {},
			world: () => {}
		}
		`)
		).toEqual(
			toOneLine(`
		const x = {
			hello: uff(() => {}, '/file.js-_hello'),
			world: uff(() => {}, '/file.js-_world')
		}
		`)
		)
	})
})

it('transforms default exports', () => {
	expect(transform(`export default function getAllConfigs() {}`)).toEqual(
		toOneLine(`
		export default uff(function getAllConfigs() {}, '/file.js-_getAllConfigs');
		`)
	)
})

describe('uff(Async) transform', () => {
	it('transforms (a)sync functions', () => {
		// sync calls
		expect(transform('const a = listUsers()')).toEqual(
			toOneLine(
				`const a = ufc(listUsers, { id: '/file.js-call-_listUsers', args: [], name: 'listUsers' })`
			)
		)
		// async calls
		expect(transform('const a = await listUsers()')).toEqual(
			toOneLine(
				`const a = await ufc(listUsers, { id: '/file.js-call-_listUsers', args: [], name: 'listUsers' })`
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
			toOneLine(`
			ufc(supabase, {
				id: '/file.js-call-_from',
				args: ['Capture'],
				name: 'from'
			})
			`)
		)

		expect(transform(`const { data, error } = await supabase.from('Capture').select('*')`)).toEqual(
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
})

export function toOneLine(code: string) {
	return code.split('\n').join('').replace(/\s+/g, '').replaceAll("'", '"').replaceAll(';', '')
}

export function transform(code: string) {
	const { code: transformedCode } = flytrapTransformUff(code, '/file.js')
	return toOneLine(transformedCode)
}
