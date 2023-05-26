import { describe, expect, it } from 'vitest'
import { parse } from 'recast'
import babelTsParser from 'recast/parsers/babel-ts.js'
import { _babelInterop } from '../src/transform/artifacts'
import babelTraverse from '@babel/traverse'
import { findIgnoredImports, shouldIgnoreCall } from '../src/transform/packageIgnores'
import { excludeDirectoriesIncludeFilePath } from '../src/transform/excludes'

describe('excludeDirectories', () => {
	it('excludeDirectoriesIncludeFilePath', () => {
		const trueFilePathFixtures = [
			'/root/src/components/ui/logo.tsx',
			'./src/components/ui/logo.tsx',
			'src/components/ui/logo.tsx'
		]
		const falseFilePathFixtures = [
			// absolute
			'/src/pages/index.js',
			// relative
			'./src/pages/index.js',
			'src/pages/index.js'
		]

		const excludeDirectoryFixtures = [
			// absolute path
			'/root/src/components/ui',
			// relative
			'./src/components/ui',
			'src/components/ui'
		]

		for (let i = 0; i < excludeDirectoryFixtures.length; i++) {
			// true assertions
			for (let j = 0; j < trueFilePathFixtures.length; j++) {
				expect(
					excludeDirectoriesIncludeFilePath(trueFilePathFixtures[j], excludeDirectoryFixtures)
				).toBe(true)
			}

			// false assertions
			for (let j = 0; j < falseFilePathFixtures.length; j++) {
				expect(
					excludeDirectoriesIncludeFilePath(falseFilePathFixtures[j], excludeDirectoryFixtures)
				).toBe(false)
			}
		}
	})
})

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
