import { describe, expect, it } from 'vitest'
import { addLinks, extractArgs, extractOutputs, reviveLinks } from '../src/core/stringify'
import {
	FLYTRAP_CLASS,
	FLYTRAP_DOM_EVENT,
	FLYTRAP_FUNCTION,
	FLYTRAP_HEADERS,
	FLYTRAP_REQUEST,
	FLYTRAP_RESPONSE,
	FLYTRAP_UNSERIALIZABLE_VALUE
} from '../src/core/constants'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { CapturedCall, type CapturedFunction } from '../src/core/types'
import SuperJSON from 'superjson'
import { safeParse, safeStringify } from '../src/core/stringify'
GlobalRegistrator.register()

it('removes cyclical dependencies', () => {
	const a = {
		b: 2,
		c: {
			d: {
				e: 2
			}
		}
	}
	// @ts-ignore
	a.c.d.e = a

	const stringifiedWithoutCircular = safeStringify(a).unwrap()

	expect(stringifiedWithoutCircular).toEqual(
		'{"json":{"b":2,"c":{"d":{"e":"FLYTRAP_UNSERIALIZABLE_VALUE"}}}}'
	)
	expect(SuperJSON.parse(stringifiedWithoutCircular)).toEqual({
		b: 2,
		c: {
			d: {
				e: FLYTRAP_UNSERIALIZABLE_VALUE
			}
		}
	})
})

it('doesnt stringify DOM events', () => {
	expect(safeParse(safeStringify(new MouseEvent('click')).unwrap()).unwrap()).toEqual(
		FLYTRAP_UNSERIALIZABLE_VALUE
	)
})

/* describe('Fetch API', () => {
	it('Response', () => {
		expect(parse(stringify(new Response()))).toEqual(FLYTRAP_RESPONSE)
	})
	it('Headers', () => {
		expect(parse(stringify(new Headers()))).toEqual(FLYTRAP_HEADERS)
	})
	it('Request', () => {
		expect(parse(stringify(new Request(new URL('https://useflytrap.com'))))).toEqual(
			FLYTRAP_REQUEST
		)
	})
}) */

const mockCapturedCalls: CapturedCall[] = [
	{
		id: 'some-id',
		invocations: [
			{
				args: ['hello world', FLYTRAP_FUNCTION],
				output: 2,
				error: { name: 'Error', message: 'Error', stack: '' },
				timestamp: 0
			},
			{
				args: ['hello world', FLYTRAP_FUNCTION],
				output: 1,
				error: { name: 'Error 2', message: 'Error', stack: '' },
				timestamp: 0
			},
			{
				args: ['foo', FLYTRAP_FUNCTION],
				output: 1,
				error: { name: 'Error', message: 'Error', stack: '' },
				timestamp: 0
			},
			{
				args: ['bar', FLYTRAP_FUNCTION],
				output: '',
				error: { name: 'Error', message: 'Error', stack: '' },
				timestamp: 0
			},
			{
				args: ['foo', FLYTRAP_FUNCTION],
				output: 'foo',
				error: { name: 'Error', message: 'Error', stack: '' },
				timestamp: 0
			}
		]
	}
]

const args = extractArgs(mockCapturedCalls)
const outputs = extractOutputs(mockCapturedCalls)

it('extractArgs', () => {
	const args = extractArgs(mockCapturedCalls)

	expect(args).toEqual([
		['hello world', FLYTRAP_FUNCTION],
		['foo', FLYTRAP_FUNCTION],
		['bar', FLYTRAP_FUNCTION]
	])
})

it('extractOutputs', () => {
	const outputs = extractOutputs(mockCapturedCalls)
	expect(outputs).toEqual([2, 1, '', 'foo'])
})

describe('Deduplication', () => {
	const invocationsFixture = mockCapturedCalls[0].invocations

	it('addLinks', () => {
		expect(addLinks(invocationsFixture, { args, outputs })).toEqual([
			{
				args: 0,
				output: 0,
				error: { name: 'Error', message: 'Error', stack: '' },
				timestamp: 0
			},
			{
				args: 0,
				output: 1,
				error: { name: 'Error 2', message: 'Error', stack: '' },
				timestamp: 0
			},
			{
				args: 1,
				output: 1,
				error: { name: 'Error', message: 'Error', stack: '' },
				timestamp: 0
			},
			{
				args: 2,
				output: 2,
				error: { name: 'Error', message: 'Error', stack: '' },
				timestamp: 0
			},
			{
				args: 1,
				output: 3,
				error: { name: 'Error', message: 'Error', stack: '' },
				timestamp: 0
			}
		])
	})

	it('reviveLinks', () => {
		expect(reviveLinks(addLinks(invocationsFixture, { args, outputs }), { args, outputs })).toEqual(
			invocationsFixture
		)
	})
})

it.skip('isClassInstance', () => {
	class Foo {}
	class Bar {}
	abstract class Baz {}
	const FooBar = class {}
	class FooBarBaz extends Baz {}

	const fixtures: any[] = [
		[new Foo(), true],
		[new Bar(), true],
		[new FooBar(), true],
		[new FooBarBaz(), true],
		[{ foo: Foo }, false],
		[{ foo: 'bar', bar: new Bar() }, false],
		[[{ foo: Foo }, new Bar()], false]
	]

	for (let i = 0; i < fixtures.length; i++) {
		// expect(isClassInstance(fixtures[i][0]), `Fixture at index ${i}`).toEqual(fixtures[i][1])
	}
})

it('processCaptures', () => {
	// const mockClass
	class HelloWorld {}
	const outputArgs = {
		user: { name: 'John Doe' },
		hello: new HelloWorld(),
		res: new Response('Hello World')
	}
	const mockCaptures: (CapturedCall | CapturedFunction)[] = [
		{
			id: 'mock-call',
			invocations: [
				{
					args: [],
					output: outputArgs,
					timestamp: 0
				}
			]
		}
	]

	/* expect(processCaptures(mockCaptures)).toEqual([
		{
			id: 'mock-call',
			invocations: [
				{
					args: [],
					output: {
						user: { name: 'John Doe' },
						hello: FLYTRAP_CLASS,
						res: FLYTRAP_RESPONSE
					},
					timestamp: 0
				}
			]
		}
	]) */
})

describe('new stringify', () => {
	// Circulars
	const a = {
		b: '23',
		c: null
	}
	const b = {
		a: 24,
		b: {
			c: {
				d: null
			},
			d: '42'
		}
	}
	// @ts-expect-error
	a.c = a

	// @ts-expect-error
	b.b.c.d = b

	type StringifyFixture = {
		fixture: any
		expected: any
	}

	class TestingClassNonPojo {
		private answer: number
		constructor(answer: number) {
			this.answer = answer
		}
	}

	const fixtures: Record<string, StringifyFixture[]> = {
		dates: [
			{
				fixture: new Date(42),
				expected: new Date(42)
			}
		],
		circulars: [
			{
				fixture: a,
				expected: {
					b: '23',
					c: FLYTRAP_UNSERIALIZABLE_VALUE
				}
			},
			{
				fixture: b,
				expected: {
					a: 24,
					b: {
						c: {
							d: FLYTRAP_UNSERIALIZABLE_VALUE
						},
						d: '42'
					}
				}
			},
			{
				fixture: [a, a],
				expected: [
					{
						b: '23',
						c: FLYTRAP_UNSERIALIZABLE_VALUE
					},
					{
						b: '23',
						c: FLYTRAP_UNSERIALIZABLE_VALUE
					}
				]
			}
		],
		// @todo: add support for Headers
		'allowed non-pojos': [
			/* {
				fixture: {
					foo: 'bar',
					baz: 42,
					z: new Headers({ hello: 'world' })
				},
				expected: {
					foo: 'bar',
					baz: 42,
					z: new Headers({ hello: 'world' })
				}
			} */
		],
		'arbitrary non-pojos': [
			{
				fixture: {
					foo: 'bar',
					baz: 42,
					z: new TestingClassNonPojo(42)
				},
				expected: {
					foo: 'bar',
					baz: 42,
					z: FLYTRAP_UNSERIALIZABLE_VALUE
				}
			},
			{
				fixture: new TestingClassNonPojo(42),
				expected: FLYTRAP_UNSERIALIZABLE_VALUE
			},
			{
				fixture: [new TestingClassNonPojo(42)],
				expected: [FLYTRAP_UNSERIALIZABLE_VALUE]
			}
		]
	}

	for (const [fixtureName, fixtureDefinitions] of Object.entries(fixtures)) {
		it(`Stringifies ${fixtureName}`, () => {
			for (let i = 0; i < fixtureDefinitions.length; i++) {
				expect(
					safeParse(safeStringify(fixtureDefinitions[i].fixture).unwrap()).unwrap()
				).toStrictEqual(fixtureDefinitions[i].expected)
			}
		})
	}
})

/*describe.skip('Encrypting captures', async () => {
	it('TODO', async () => {
		expect(await encryptCaptures(mockCapturedCalls, '')).toEqual([])
	})
}) */
