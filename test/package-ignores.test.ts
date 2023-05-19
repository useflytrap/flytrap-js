import { describe, expect, it } from 'vitest'
import { parse } from 'recast'
import babelTsParser from 'recast/parsers/babel-ts.js'
import { _babelInterop } from '../src/transform/artifacts'
import babelTraverse from '@babel/traverse'
import { findIgnoredImports, shouldIgnoreCall } from '../src/transform/packageIgnores'

describe('packageIgnores', () => {
	it('findIgnoredImports', () => {
		expect(
			findIgnoredImports(
				`
		import { z } from 'zod';
		`,
				['zod']
			)
		).toEqual(['z'])

		expect(
			findIgnoredImports(
				`
		import { z as x } from 'zod';
		`,
				['zod']
			)
		).toEqual(['x'])

		expect(
			findIgnoredImports(
				`
		import { a, b, c } from 'zod';
		`,
				['zod']
			)
		).toEqual(['a', 'b', 'c'])

		// Nested imports
		expect(
			findIgnoredImports(
				`
		import { a, b, c } from 'zod/nested';
		`,
				['zod']
			)
		).toEqual(['a', 'b', 'c'])
		expect(
			findIgnoredImports(
				`
		import { Inter } from 'next/font/google'
		import { a } from 'next'
		`,
				['next/font']
			)
		).toEqual(['Inter'])
	})

	const fixtures = [
		{
			name: 'namespaced calls',
			ignoredImports: ['z'],
			fixture: `
			import { z } from 'zod';
			const schema = z.string()
			`
		},
		{
			name: 'normal calls',
			ignoredImports: ['z'],
			fixture: `
			import { z } from 'zod';
			const schema = z()
			`
		},
		{
			name: 'nextjs font',
			ignoredImports: ['Inter'],
			fixture: `
			import { Inter } from 'next/font/google'
			const inter = Inter({ subsets: ['latin'] })
			`
		},
		{
			name: 'chained calls',
			ignoredImports: ['z'],
			fixture: `
			import { z } from 'zod';
			const schema = z.string().email()
			`
		}
	]

	for (let i = 0; i < fixtures.length; i++) {
		it(`ignores ${fixtures[i].name}`, () => {
			const ast = parse(fixtures[i].fixture, { parser: babelTsParser })
			_babelInterop(babelTraverse)(ast, {
				CallExpression(path) {
					expect(shouldIgnoreCall(path, fixtures[i].ignoredImports)).toEqual(true)
				}
			})
		})
	}
})
