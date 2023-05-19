import { expect, it } from 'vitest'
import { stringify } from '../src/core/stringify'
import SuperJSON from 'superjson'

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
