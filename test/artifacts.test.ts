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

const largeFixture = `
function Home() {
	const [inputValue, setInputValue] = useState('')

	function submit() {
		console.log('Input Value:', inputValue)
		if (inputValue === 'wrong') {
			throw new Error("Input value is wrong")
		}
		alert("Submitted wrong")
	}
}
`

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

type ArtifactMarkingsTest = {
	fixture: string
	functionDef?: string
	paramsDef?: string
	argumentsDef?: string
	callDef?: string
}

function codeToArtifactMarkingsTest(fixture: string): ArtifactMarkingsTest {
	const markings = addArtifactMarkings(fixture, '/file.js')
	const functionMarking = markings.find((m) => m.type === 'function')
	const callMarking = markings.find((m) => m.type === 'call')
	const argumentsMarking = markings.find((m) => m.type === 'arguments')
	const paramsMarking = markings.find((m) => m.type === 'params')
	return {
		fixture,
		...(functionMarking && {
			functionDef: fixture.substring(functionMarking.startIndex, functionMarking.endIndex)
		}),
		...(callMarking && {
			callDef: fixture.substring(callMarking.startIndex, callMarking.endIndex)
		}),
		...(argumentsMarking && {
			argumentsDef: fixture.substring(argumentsMarking.startIndex, argumentsMarking.endIndex)
		}),
		...(paramsMarking && {
			paramsDef: fixture.substring(paramsMarking.startIndex, paramsMarking.endIndex)
		})
	}
}

const artifactMarkingsFixtures: Record<string, ArtifactMarkingsTest[]> = {
	'function calls': [
		{
			fixture: 'console.log(a)',
			callDef: 'console.log',
			argumentsDef: '(a)'
		},
		{
			fixture: 'console.log()',
			callDef: 'console.log',
			argumentsDef: '()'
		},
		// random spacing
		{
			fixture: 'console.log  (a) ',
			callDef: 'console.log  ',
			argumentsDef: '(a)'
		},
		{
			fixture: 'console.log  () ',
			callDef: 'console.log  ',
			argumentsDef: '()'
		}
	],
	'function definitions': [
		// function def inside function call
		{
			fixture: 'useEffect((a) => {}, [])',
			callDef: 'useEffect',
			paramsDef: '(a)',
			argumentsDef: '((a) => {}, [])'
		},
		// function declaration
		{
			fixture: 'function foo(a) {}',
			functionDef: 'function foo',
			paramsDef: '(a)'
		},
		{
			fixture: 'function foo() {}',
			functionDef: 'function foo',
			paramsDef: '()'
		},
		// function declaration weird spacing
		{
			fixture: 'function foo  (a)    {}',
			functionDef: 'function foo',
			paramsDef: '(a)'
		},
		{
			fixture: 'function foo  ()   {}',
			functionDef: 'function foo',
			paramsDef: '()'
		},
		// arrow function
		{
			fixture: 'const x = (a) => {}',
			paramsDef: '(a)'
		},
		{
			fixture: 'const x = a => {}',
			paramsDef: ' a '
		},
		{
			fixture: 'const x = () => {}',
			paramsDef: '()'
		},
		// arrow functions weird spacing
		{
			fixture: 'const x =  (a)   => {}',
			paramsDef: '(a)'
		},
		{
			fixture: 'const x =   a   => {}',
			paramsDef: ' a '
		},
		{
			fixture: 'const x =   ()   =>  {}',
			paramsDef: '()'
		},
		// function expression
		{
			fixture: 'const x = function(a) {}',
			functionDef: 'function',
			paramsDef: '(a)'
		},
		{
			fixture: 'const x = function foo(a) {}',
			functionDef: 'function foo',
			paramsDef: '(a)'
		},
		{
			fixture: 'const x = function() {}',
			functionDef: 'function',
			paramsDef: '()'
		},
		// function expression weird spacing
		{
			fixture: 'const x = function  (a)   {}',
			functionDef: 'function  ',
			paramsDef: '(a)'
		},
		{
			fixture: 'const x = function foo  (a)  {}',
			functionDef: 'function foo  ',
			paramsDef: '(a)'
		},
		{
			fixture: 'const x = function  ()   {}',
			functionDef: 'function  ',
			paramsDef: '()'
		}
	]
}

describe('artifact markings new', () => {
	for (const [suiteName, artifactTests] of Object.entries(artifactMarkingsFixtures)) {
		it(suiteName, () => {
			for (let i = 0; i < artifactTests.length; i++) {
				expect(codeToArtifactMarkingsTest(artifactTests[i].fixture)).toEqual(artifactTests[i])
			}
		})
	}
})

it('artifacts markings complete', () => {
	const markings = addArtifactMarkings(largeFixture, '/file.js')
	// @todo: finish this test
})
