import { flytrapTransformArtifacts } from '../src/transform/index'
import { describe, it } from 'vitest'
import { extractArtifacts } from '../src/transform/artifacts/artifacts'

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
})
