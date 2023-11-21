// Generate tests using Flytrap

import MagicString from 'magic-string'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tryCatchSync } from '../../src/core/util'
import { flytrapTransformUff } from '../../src/transform/index'

export const generatedPath = join(__dirname, 'generated-fixtures')

beforeAll(async () => {
	// Create generated fixtures
	tryCatchSync(() => mkdirSync(generatedPath))

	const filesInCurrentDirectory = readdirSync(join(__dirname, 'ecosystem-fixtures'))

	for (let i = 0; i < filesInCurrentDirectory.length; i++) {
		const fixture = readFileSync(
			join(__dirname, 'ecosystem-fixtures', filesInCurrentDirectory[i])
		).toString()
		const generatedFixture = transformFixture(fixture)
		writeFileSync(
			join(__dirname, 'generated-fixtures', filesInCurrentDirectory[i]),
			generatedFixture
		)
	}
}, 30_000)

afterAll(() => {
	rmSync(generatedPath, { recursive: true })
})

it('Generates', () => {
	// Just to make `beforeAll` run
	expect(true).toEqual(true)
})

function findTransformLocations(input: string): Array<{ start: number; end: number }> {
	const locations: Array<{ start: number; end: number }> = []
	const startIdentifier = '// @flytrap-transform-start'
	const endIdentifier = '// @flytrap-transform-end'

	let startIndex = input.indexOf(startIdentifier)
	let endIndex = input.indexOf(endIdentifier)

	while (startIndex != -1 && endIndex != -1) {
		// Push start and end indices (accounting for length of the identifiers)
		locations.push({ start: startIndex + startIdentifier.length, end: endIndex })

		// Look for next occurrence
		startIndex = input.indexOf(startIdentifier, endIndex + endIdentifier.length)
		endIndex = input.indexOf(endIdentifier, endIndex + endIdentifier.length)
	}

	return locations
}

function transformFixture(code: string) {
	const s = new MagicString(code)

	const transformLocations = findTransformLocations(code)

	// Transform
	for (let i = 0; i < transformLocations.length; i++) {
		const contentToTransform = code.substring(
			transformLocations[i].start,
			transformLocations[i].end
		)
		const transformedCode = flytrapTransformUff(contentToTransform, '/file.js').code
		s.update(transformLocations[i].start, transformLocations[i].end, transformedCode)
	}

	return s.toString()
}
