import { describe, expect, it } from 'vitest'
// import { parse } from 'recast'
// import babelTsParser from 'recast/parsers/babel-ts.js'
import { parse } from '@babel/parser'
import { _babelInterop } from '../src/transform/artifacts/artifacts'
import babelTraverse from '@babel/traverse'
import { findIgnoredImports, shouldIgnoreCall } from '../src/transform/packageIgnores'
import {
	excludeDirectoriesIncludeFilePath,
	shouldIgnoreFunctionName
} from '../src/transform/excludes'
import { CapturePayload } from '../src/exports'
import { shouldIgnoreCapture } from '../src/core/captureIgnores'

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
			// const ast = parse(fixtures[i].fixture, { parser: babelTsParser })
			const ast = parse(fixtures[i].fixture, { sourceType: 'module', plugins: ['jsx', 'typescript'] })
			_babelInterop(babelTraverse)(ast, {
				CallExpression(path) {
					expect(shouldIgnoreCall(path, fixtures[i].ignoredImports)).toEqual(true)
				}
			})
		})
	}
})

describe('captureIgnores', () => {
	const createMockCapturePayload = (partialPayload: Partial<CapturePayload>): CapturePayload => ({
		functionName: 'Lorem ipsum',
		capturedUserId: 'rasmus@useflytrap.com',
		args: '',
		outputs: '',
		error: 'encrypted',
		functions: [],
		calls: [],
		projectId: 'mock-project-id'
	})

	const mockCapturePayload = createMockCapturePayload({})

	const fixtures = {
		strings: [
			['Hello World', false],
			['Lorem ipsuM', false],
			['', false],
			['Lorem', true],
			['Lorem ipsum', true]
		],
		funcs: [
			[() => true, true],
			[(c: CapturePayload) => c.functionName.includes('Lorem'), true],
			[(c: CapturePayload) => c.capturedUserId === 'rasmus@useflytrap.com', true],
			[() => false, false],
			[(c: CapturePayload) => c.functionName.includes('LoRem'), false],
			[(c: CapturePayload) => c.capturedUserId === 'max@useflytrap.com', false]
		],
		regexps: [
			[/Hello World/g, false],
			[/Lorem ipsuM/g, false],
			[/\\/g, false],
			[/Lorem/g, true],
			[/Lorem ipsum/g, true],
			[(c: CapturePayload) => c.functionName.includes('Lorem'), true],
			[(c: CapturePayload) => c.capturedUserId === 'rasmus@useflytrap.com', true],
			[() => false, false],
			[(c: CapturePayload) => c.functionName.includes('LoRem'), false],
			[(c: CapturePayload) => c.capturedUserId === 'max@useflytrap.com', false]
		]
	} as const

	for (const [key, keyFixtures] of Object.entries(fixtures)) {
		it(`capture ignores > ${key}`, () => {
			for (let i = 0; i < keyFixtures.length; i++) {
				expect(
					shouldIgnoreCapture(mockCapturePayload, [keyFixtures[i][0]]),
					`fixture "${keyFixtures[i][0]}"`
				).toEqual(keyFixtures[i][1])
			}
		})
	}
})

describe('ignoredFunctionNames', () => {
	const fixtures = [
		{
			name: 'namespaced calls',
			ignoredFunctionNames: ['console.log'],
			fixture: `console.log('foo bar')`
		},
		{
			name: 'normal calls',
			ignoredFunctionNames: ['defineProps'],
			fixture: `defineProps({})`
		}
	]

	for (let i = 0; i < fixtures.length; i++) {
		it(`ignores ${fixtures[i].name}`, () => {
			// const ast = parse(fixtures[i].fixture, { parser: babelTsParser })
			const ast = parse(fixtures[i].fixture, { sourceType: 'module', plugins: ['jsx', 'typescript'] })
			_babelInterop(babelTraverse)(ast, {
				CallExpression(path) {
					expect(shouldIgnoreFunctionName(path, fixtures[i].ignoredFunctionNames)).toEqual(true)
				}
			})
		})
	}
})
