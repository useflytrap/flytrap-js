import { describe, it } from 'vitest'
import { walk } from '../src/core/stringify'

describe('stringifying unserialzable values', () => {
	it('handles cyclical dependencies', () => {
		const b = {}
		const a = {
			b: b
		}
		// a.b = a

		walk(a, {})
	})
})
