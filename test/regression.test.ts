import { describe, expect, it } from 'vitest'
import { initTRPC } from '@trpc/server'
import { removeCircularsAndNonPojos } from '../src/core/stringify'
// import { removeCircularDependencies } from '../src/core/stringify'

describe('Regression', () => {
	it('regression #2 > can remove circulars from non-POJOs', () => {
		const trpcInstance = initTRPC.create({})
		const withoutCirculars = removeCircularsAndNonPojos(trpcInstance)
		expect(typeof withoutCirculars).toEqual('object')
	})

	it("regression #3 > doesn't give false positives to circular", () => {
		const items = ['abc', 'def']
		const calls = [items, items]
		const callsWithoutCirculars = removeCircularsAndNonPojos(calls)
		expect(callsWithoutCirculars).toEqual([
			['abc', 'def'],
			['abc', 'def']
		])
	})
})
