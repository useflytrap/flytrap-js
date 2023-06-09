import { flytrapTransformArtifacts } from '../src/transform/index'
import { describe, expect, it } from 'vitest'
import { extractArtifacts } from '../src/transform/artifacts/artifacts'
import { initTRPC } from '@trpc/server'
import { removeCircularDependencies } from '../src/core/stringify'
import SuperJSON from 'superjson'

describe('Regression', () => {
	it('regression #1 > generates correct artifacts that match the transformed code', async () => {
		const fixture = `
		export const useRequestAccess = create((set) => ({
			setOpen: (open: boolean) => set((state) => ({ open }))
		}))
		`

		const transformedCode = await flytrapTransformArtifacts(fixture, '/stores.ts').code
		const artifacts = extractArtifacts(fixture, '/stores.ts')

		const functionOrCallIds = artifacts.map((a) => a.functionOrCallId)
		const missingIds = new Set<string>([])
		for (let i = 0; i < functionOrCallIds.length; i++) {
			if (!transformedCode.includes(functionOrCallIds[i])) {
				missingIds.add(functionOrCallIds[i])
			}
		}

		if (missingIds.size > 0) {
			throw new Error(
				`Transformed code is missing ${missingIds.size} IDs. Following are missing: ${new Array(
					...missingIds
				)
					.map((m) => `"${m}"`)
					.join(', ')}`
			)
		}
	})

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
