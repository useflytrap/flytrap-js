import { describe, expect, it } from 'vitest'
import { initTRPC } from '@trpc/server'
import { removeCircularDependencies } from '../src/core/stringify'

describe('Regression', () => {
	it('regression #2 > can remove circulars from non-POJOs', () => {
		const trpcInstance = initTRPC.create({})
		const withoutCirculars = removeCircularDependencies(trpcInstance)
		expect(typeof withoutCirculars).toEqual('object')
	})

	it.skip("regression #3 > doesn't give false positives to circular", () => {
		const items = ['abc', 'def']
		const calls = [items, items]
		const callsWithoutCirculars = removeCircularDependencies(calls)
		expect(callsWithoutCirculars).toEqual([
			['abc', 'def'],
			['abc', 'def']
		])
	})
})
