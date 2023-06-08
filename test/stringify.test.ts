import { describe, expect, it } from 'vitest'
import { parse, stringify } from '../src/core/stringify'
import SuperJSON from 'superjson'
import {
	FLYTRAP_DOM_EVENT,
	FLYTRAP_HEADERS,
	FLYTRAP_REQUEST,
	FLYTRAP_RESPONSE
} from '../src/core/constants'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
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
