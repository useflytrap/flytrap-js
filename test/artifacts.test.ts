import { describe, expect, it } from 'vitest'
import {
	addArtifactMarkings,
	extractCurrentScope,
	extractFunctionCallId
} from '../src/transform/artifacts/artifacts'
import babelTraverse from '@babel/traverse'
import { parse } from '@babel/parser'
import { flytrapTransformWithArtifacts } from '../src/transform/index'
import { config } from 'dotenv'
import { getParseConfig } from '../src/transform/config'
import { _babelInterop } from '../src/transform/util'
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

	return (
		<main className="flex min-h-screen flex-col items-center justify-between p-24">
			<div className='text-black'>
				<input value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
			</div>
			<button onClick={() => submit()}>Submit</button>
		</main>
	)
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
		const ast = parse(functionCallIdFixture, getParseConfig())
		_babelInterop(babelTraverse)(ast, {
			CallExpression(path) {
				const scopes = extractCurrentScope(path)
				const functionCallId = extractFunctionCallId(path, '/file.js', 'foo', scopes)
				firstCallIds.push(functionCallId)
			}
		})

		const ast2 = parse(functionCallIdWithAdditionFixture, getParseConfig())
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
			const ast = parse(scopeFixtures[i].fixture, getParseConfig())
			_babelInterop(babelTraverse)(ast, {
				CallExpression(path) {
					expect(extractCurrentScope(path)).toEqual(scopeFixtures[i].scopes)
				}
			})
		}
	})

	it('extracts scope for functions', () => {
		for (let i = 0; i < scopeFuncFixtures.length; i++) {
			const ast = parse(scopeFuncFixtures[i].fixture, {
				sourceType: 'module',
				plugins: ['jsx', 'typescript']
			})
			_babelInterop(babelTraverse)(ast, {
				ArrowFunctionExpression(path) {
					expect(extractCurrentScope(path, true)).toEqual(scopeFuncFixtures[i].scopes)
				}
			})
		}
	})
})

const pageCodeFixture = `
function Home() {
	useState()
	function submit() {}
	return null
}

export const DashboardLayout = ({ children }: any) => {
	const supabaseClient = useSupabaseClient()
	const user = useUser()

	useEffect(() => {
		console.log(user)
	}, [user])

	function signOut() {
		console.log("Signed out")
	}

	return (
		<h1>{user?.name}</h1>
	)
}
`

it('generates values same as transform', () => {
	const { code, artifactMarkings } = flytrapTransformWithArtifacts(
		pageCodeFixture,
		'/file.js',
		undefined,
		true
	)
	const functionIds = artifactMarkings.map((a) => a.functionOrCallId)

	for (let i = 0; i < functionIds.length; i++) {
		expect(code.code).toContain(functionIds[i] as string)
	}
})

type ArtifactMarkingsTest = {
	fixture: string
	functionDef?: string
	paramsDef?: string
	argumentsDef?: string
	callDef?: string
}

function codeToArtifactMarkingsTest(fixture: string): Omit<ArtifactMarkingsTest, 'fixture'> {
	const artifactMarkingsResult = addArtifactMarkings(fixture, '/file.js')

	if (artifactMarkingsResult.err) {
		throw new Error(artifactMarkingsResult.val.toString())
	}

	const markings = artifactMarkingsResult.val

	const functionMarking = markings.find((m) => m.type === 'function')
	const callMarking = markings.find((m) => m.type === 'call')
	const argumentsMarking = markings.find((m) => m.type === 'arguments')
	const paramsMarking = markings.find((m) => m.type === 'params')
	return {
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
			fixture: 'console.log(a, b)',
			callDef: 'console.log',
			argumentsDef: '(a, b)'
		},
		{
			fixture: 'console.log()',
			callDef: 'console.log',
			argumentsDef: '()'
		},
		// random spacing
		{
			fixture: 'console.log  (a)',
			callDef: 'console.log',
			argumentsDef: '(a)'
		},
		{
			fixture: 'console.log  (a, b)',
			callDef: 'console.log',
			argumentsDef: '(a, b)'
		},
		{
			fixture: 'console.log  () ',
			callDef: 'console.log',
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
		/* { @todo: add back
			fixture: 'function foo  ()   {}',
			functionDef: 'function foo',
			paramsDef: '()'
		}, */
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

describe.skip('artifact markings new', () => {
	for (const [suiteName, artifactTests] of Object.entries(artifactMarkingsFixtures)) {
		it(suiteName, () => {
			for (let i = 0; i < artifactTests.length; i++) {
				const { fixture, ...testWithoutFixture } = artifactTests[i]
				expect(codeToArtifactMarkingsTest(artifactTests[i].fixture)).toEqual(testWithoutFixture)
			}
		})
	}
})
