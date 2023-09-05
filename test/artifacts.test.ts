import { afterAll, describe, expect, it } from 'vitest'
import {
	_babelInterop,
	addArtifactMarkings,
	extractCurrentScope,
	extractFunctionCallId
} from '../src/transform/artifacts/artifacts'
import babelTraverse from '@babel/traverse'
import { parse } from 'recast'
import babelTsParser from 'recast/parsers/babel-ts.js'
import { Identifier } from '@babel/types'
import { flytrapTransformArtifacts } from '../src/transform/index'
import { config } from 'dotenv'
config()

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
			scopes: []
		},
		{
			name: 'arrow function scope',
			fixture: `
			const arrowFuncScope = () => {
				foo()
			}
			`,
			scopes: ['arrowFuncScope']
		},
		{
			name: 'function expression scope',
			fixture: `
			const funcExprScope = function() {
				foo()
			}
			`,
			scopes: ['funcExprScope']
		},
		{
			name: 'function declaration scope',
			fixture: `
			function funcDeclScope() {
				foo()
			}
			`,
			scopes: ['funcDeclScope']
		}
	]
	const scopeFuncFixtures = [
		{
			name: 'function call scope',
			fixture: `
			users.find((u) => u.name === '')
			`,
			scopes: ['find']
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

	it('extracts scope for functions', () => {
		for (let i = 0; i < scopeFuncFixtures.length; i++) {
			const ast = parse(scopeFuncFixtures[i].fixture, { parser: babelTsParser })
			_babelInterop(babelTraverse)(ast, {
				ArrowFunctionExpression(path) {
					expect(extractCurrentScope(path, true)).toEqual(scopeFuncFixtures[i].scopes)
				}
			})
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
	const extractedMarkings = addArtifactMarkings(pageCodeFixture, '/file.js')
	const transformedCode = flytrapTransformArtifacts(pageCodeFixture, '/file.js')

	const functionIds = extractedMarkings.map((e) => e.functionOrCallId).filter(Boolean)
	for (let i = 0; i < functionIds.length; i++) {
		expect(transformedCode.code).toContain(functionIds[i] as string)
	}
})

describe('artifacts markings', () => {
	it('function calls', () => {
		expect(addArtifactMarkings(`console.log(a)`, '/file.js')).toEqual([
			{
				type: 'call',
				functionOrCallId: '/file.js-call-_log',
				startIndex: 0,
				endIndex: 10
			},
			{
				type: 'arguments',
				functionOrCallId: '/file.js-call-_log',
				startIndex: 11,
				endIndex: 13
			}
		])

		expect(addArtifactMarkings(`console.log()`, '/file.js')).toEqual([
			{
				type: 'call',
				functionOrCallId: '/file.js-call-_log',
				startIndex: 0,
				endIndex: 11
			},
			{
				type: 'arguments',
				functionOrCallId: '/file.js-call-_log',
				startIndex: 12,
				endIndex: 13
			}
		])
	})

	describe('function definitions', () => {
		it('function def inside function call', () => {
			expect(addArtifactMarkings(`useEffect((a) => {}, [])`, '/file.js')).toEqual([
				{
					type: 'call',
					functionOrCallId: '/file.js-call-_useEffect',
					startIndex: 0,
					endIndex: 8
				},
				{
					type: 'arguments',
					functionOrCallId: '/file.js-call-_useEffect',
					startIndex: 9,
					endIndex: 23
				},
				{
					type: 'params',
					functionOrCallId: '/file.js-_anonymous',
					startIndex: 10,
					endIndex: 12
				}
			])
		})
		it('func decl', () => {
			expect(addArtifactMarkings(`function foo(a) {}`, '/file.js')).toEqual([
				{
					type: 'function',
					functionOrCallId: '/file.js-_foo',
					startIndex: 0,
					endIndex: 12
				},
				{
					type: 'params',
					functionOrCallId: '/file.js-_foo',
					startIndex: 12,
					endIndex: 14
				}
			])
		})
		it('arrow func', () => {
			expect(addArtifactMarkings(`const x = (a) => {}`, '/file.js')).toEqual([
				{
					type: 'params',
					functionOrCallId: '/file.js-_x',
					startIndex: 10,
					endIndex: 12
				}
			])
			// without parenthesis
			expect(addArtifactMarkings(`const x = a => {}`, '/file.js')).toEqual([
				/* {
					type: 'function',
					functionOrCallId: '/file.js-_x',
					startIndex: 0,
					endIndex: 12,
				}, */
				{
					type: 'params',
					functionOrCallId: '/file.js-_x',
					startIndex: 9,
					endIndex: 11
				}
			])
		})
		it('function expression', () => {
			expect(addArtifactMarkings(`const x = function (a) {}`, '/file.js')).toEqual([
				{
					type: 'function',
					functionOrCallId: '/file.js-_x',
					startIndex: 10,
					endIndex: 19
				},
				{
					type: 'params',
					functionOrCallId: '/file.js-_x',
					startIndex: 19,
					endIndex: 21
				}
			])
			expect(addArtifactMarkings(`const x = function foo(a) {}`, '/file.js')).toEqual([
				{
					type: 'function',
					functionOrCallId: '/file.js-_foo',
					startIndex: 10,
					endIndex: 22
				},
				{
					type: 'params',
					functionOrCallId: '/file.js-_foo',
					startIndex: 22,
					endIndex: 24
				}
			])
		})
	})
})
