import { describe, expect, it } from 'vitest'
import {
	addLinks,
	extractArgs,
	extractOutputs,
	parse,
	reviveLinks,
	stringify
} from '../src/core/stringify'
import SuperJSON from 'superjson'
import {
	FLYTRAP_DOM_EVENT,
	FLYTRAP_FUNCTION,
	FLYTRAP_HEADERS,
	FLYTRAP_REQUEST,
	FLYTRAP_RESPONSE
} from '../src/core/constants'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { CapturedCall } from '../src/exports'
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

	const stringifiedWithoutCircular = stringify(a)

	expect(stringifiedWithoutCircular).toEqual('{"json":{"b":2,"c":{"d":{"e":null}}},"meta":{}}')
	expect(SuperJSON.parse(stringifiedWithoutCircular)).toEqual({
		b: 2,
		c: {
			d: {
				e: null
			}
		}
	})
})

it('doesnt stringify DOM events', () => {
	expect(parse(stringify(new MouseEvent('click')))).toEqual(FLYTRAP_DOM_EVENT)
})

describe('Fetch API', () => {
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
})

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

/*describe.skip('Encrypting captures', async () => {
	it('TODO', async () => {
		expect(await encryptCaptures(mockCapturedCalls, '')).toEqual([])
	})
}) */
