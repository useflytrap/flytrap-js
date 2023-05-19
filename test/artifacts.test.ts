import { describe, expect, it } from 'vitest'
import {
	_babelInterop,
	extractArtifacts,
	extractCurrentScope,
	extractFunctionCallId
} from '../src/transform/artifacts'
import babelTraverse from '@babel/traverse'
import { parse } from 'recast'
import babelTsParser from 'recast/parsers/babel-ts.js'
import { Identifier } from '@babel/types'
import { flytrapTransformArtifacts } from '../src/transform/index'

describe('Artifacts for functions', () => {
	const arrowFunctionFixture = `
	const foo = (bar, baz) => {
		return bar + baz;
	}
	`
	const functionDeclarationFixture = `
	function foo(bar, baz) {
		return bar + baz;
	}
	`
	const functionExpressionFixture = `
	const foo = function(bar, baz) {
		return bar + baz;
	}
	`

	const fixtures = [arrowFunctionFixture, functionDeclarationFixture, functionExpressionFixture]

	it('source', () => {
		for (let i = 0; i < fixtures.length; i++) {
			expect(extractArtifacts(fixtures[i], '/file.js')[0].source).toEqual({
				filePath: '/file.js',
				lineNumber: 2
			})
		}
	})

	it('scopes', () => {
		for (let i = 0; i < fixtures.length; i++) {
			expect(extractArtifacts(fixtures[i], '/file.js')[0].scopes).toEqual([])
		}
	})
	it('functionOrCallId', () => {
		for (let i = 0; i < fixtures.length; i++) {
			expect(extractArtifacts(fixtures[i], '/file.js')[0].functionOrCallId).toEqual('/file.js-_foo')
		}
	})
	it('functionOrCallName', () => {
		for (let i = 0; i < fixtures.length; i++) {
			expect(extractArtifacts(fixtures[i], '/file.js')[0].functionOrCallName).toEqual('foo')
		}
	})
	it('params', () => {
		for (let i = 0; i < fixtures.length; i++) {
			expect(extractArtifacts(fixtures[i], '/file.js')[0].params).toEqual('bar, baz')
		}
	})
	it('functionId is undefined', () => {
		for (let i = 0; i < fixtures.length; i++) {
			expect(extractArtifacts(fixtures[i], '/file.js')[0].functionId).toEqual(undefined)
		}
	})
})

describe('extractFunction(Call)Id', () => {
	it('extractFunctionCallId', () => {
		const functionCallIdFixture = `
		foo()
		{
			foo()
		}
		`
		const functionCallIdWithAdditionFixture = `
		foo()
		function foobar() {
			foo()
		}
		{
			foo()
		}
		`
		const firstCallIds: string[] = []
		const secondCallIds: string[] = []
		const ast = parse(functionCallIdFixture, { parser: babelTsParser })
		_babelInterop(babelTraverse)(ast, {
			CallExpression(path) {
				const scopes = extractCurrentScope(path)
				const functionCallId = extractFunctionCallId(path, '/file.js', 'foo', scopes)
				firstCallIds.push(functionCallId)
			}
		})

		const ast2 = parse(functionCallIdWithAdditionFixture, { parser: babelTsParser })
		_babelInterop(babelTraverse)(ast2, {
			CallExpression(path) {
				const scopes = extractCurrentScope(path)
				const functionCallId = extractFunctionCallId(path, '/file.js', 'foo', scopes)
				secondCallIds.push(functionCallId)
			}
		})

		expect(firstCallIds[0]).toBe(secondCallIds[0])
		expect(firstCallIds[1]).toBe(secondCallIds[2])
	})
	it.todo('extractFunctionId')
})

describe('extractCurrentScope', () => {
	const scopeFixtures = [
		{
			name: 'block scope',
			fixture: `{ foo() }`,
			scopes: ['{}']
		},
		{
			name: 'arrow function scope',
			fixture: `
			const arrowFuncScope = () => {
				foo()
			}
			`,
			scopes: ['arrowFuncScope', '{}']
		},
		{
			name: 'function expression scope',
			fixture: `
			const funcExprScope = function() {
				foo()
			}
			`,
			scopes: ['funcExprScope', '{}']
		},
		{
			name: 'function declaration scope',
			fixture: `
			function funcDeclScope() {
				foo()
			}
			`,
			scopes: ['funcDeclScope', '{}']
		}
	]

	it('extracts scope for calls', () => {
		for (let i = 0; i < scopeFixtures.length; i++) {
			const ast = parse(scopeFixtures[i].fixture, { parser: babelTsParser })
			_babelInterop(babelTraverse)(ast, {
				CallExpression(path) {
					expect(extractCurrentScope(path)).toEqual(scopeFixtures[i].scopes)
				}
			})
		}
	})

	it.todo('extracts scope for functions')
})

describe('Artifacts for function calls', () => {
	const syncCallExpressionFixture = `
	const foo = bar(a, b)
	`
	const asyncCallExpressionFixture = `
	const foo = await bar(a, b)
	`
	const chainedCallExpressionFixture = `
	const foo = bar(a, b).baz()
	`

	const fixtures = [syncCallExpressionFixture, asyncCallExpressionFixture]

	it('source', () => {
		for (let i = 0; i < fixtures.length; i++) {
			expect(extractArtifacts(fixtures[i], '/file.js')[0].source).toEqual({
				filePath: '/file.js',
				lineNumber: 2
			})
		}
	})

	it('scopes', () => {
		for (let i = 0; i < fixtures.length; i++) {
			expect(extractArtifacts(fixtures[i], '/file.js')[0].scopes).toEqual([])
		}
	})
	it('functionOrCallId', () => {
		for (let i = 0; i < fixtures.length; i++) {
			expect(extractArtifacts(fixtures[i], '/file.js')[0].functionOrCallId).toEqual(
				'/file.js-call-_bar'
			)
		}
	})
	it('functionOrCallName', () => {
		for (let i = 0; i < fixtures.length; i++) {
			expect(extractArtifacts(fixtures[i], '/file.js')[0].functionOrCallName).toEqual('bar')
		}

		expect(
			extractArtifacts(chainedCallExpressionFixture, '/file.js')[0].functionOrCallName
		).toEqual('baz')
	})
	it('params', () => {
		for (let i = 0; i < fixtures.length; i++) {
			expect(extractArtifacts(fixtures[i], '/file.js')[0].params).toEqual('a, b')
		}
		expect(extractArtifacts(chainedCallExpressionFixture, '/file.js')[0].params).toEqual('')
	})
	it('functionId', () => {
		for (let i = 0; i < fixtures.length; i++) {
			expect(extractArtifacts(fixtures[i], '/file.js')[0].functionId).toEqual(undefined)
		}
	})
})

it.skip('getWrappingFunctionId', () => {
	const ast = parse(
		`
		function foo() {
			bar()
		}
		`,
		{ parser: babelTsParser }
	)
	_babelInterop(babelTraverse)(ast, {
		CallExpression(path) {
			if ((path.node.callee as Identifier).name === 'bar') {
				/* const wrappingId = getWrappingFunctionIdNew(path, '/file.js')
				expect(wrappingId).toEqual('/file.js-_foo') */
			}
		}
	})
})

const pageCodeFixture = `
function Home() {
	useState()
	function submit() {}
	return null
}
`

it('generates values same as transform', () => {
	const extracted = extractArtifacts(pageCodeFixture, '/file.js')
	const transformedCode = flytrapTransformArtifacts(pageCodeFixture, '/file.js')

	const functionIds = extracted.map((e) => e.functionId).filter(Boolean)
	for (let i = 0; i < functionIds.length; i++) {
		expect(transformedCode.code).toContain(functionIds[i] as string)
	}
})
