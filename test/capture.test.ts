import {
	useFlytrapFunction,
	useFlytrapCall,
	clearCapturedFunctions,
	clearCapturedCalls,
	getCapturedCalls,
	getExecutingFunction,
	getCapturedFunctions
} from '../src/index'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('useFlytrapFunction capture', () => {
	it('this', () => {
		const thisObj = {
			hello: () => 'world'
		}

		const wrappedFuction = useFlytrapFunction(
			function () {
				// @ts-expect-error
				return (this as any)?.hello?.()
			},
			{ id: '/file.js-_wrappedFunction' }
		)

		expect(wrappedFuction.bind(thisObj)()).toEqual('world')
	})
	it.todo('captures errors inside the wrapped function')
})

function clearFlytrapStorage() {
	// TODO: move this to actual flytrap storage
	clearCapturedFunctions()
	clearCapturedCalls()
}

describe('useFlytrapCall capture', () => {
	beforeEach(() => {
		// tell vitest we use mocked time
		vi.useFakeTimers()
		clearFlytrapStorage()
	})

	afterEach(() => {
		// restoring date after each test run
		vi.useRealTimers()
	})

	it('captures input args', () => {
		const date = new Date(0)
		vi.setSystemTime(date)

		// Basic
		const worldString = 'world'

		useFlytrapCall(console, {
			id: '/file.js-console.log',
			args: ['hello', worldString],
			name: 'log'
		})

		expect(getCapturedCalls()).toStrictEqual([
			{
				id: '/file.js-console.log',
				invocations: [
					{
						id: '/file.js-console.log',
						args: ['hello', 'world'],
						name: 'log',
						output: undefined,
						timestamp: 0
					}
				]
			}
		])
	})

	it('forwards values', () => {
		const fixture = {
			hello: {
				world: useFlytrapFunction(() => 2, {
					id: 'someid'
				})
			}
		}

		const returnVal = useFlytrapCall(fixture.hello, {
			id: '/file.js-hello.world',
			args: [],
			name: 'world'
		})
		expect(returnVal).toBe(2)
	})

	it('correctly marks function causing the error when manually capturing', () => {
		const date = new Date(0)
		vi.setSystemTime(date)
		clearFlytrapStorage()

		let caughtExecutingFunctionId: string | undefined = undefined

		const GET = useFlytrapFunction(
			function GET() {
				const users = [1, 2, 3, 4, 5]
				const foundUser = useFlytrapCall(users, {
					id: '/file.js-call-_find',
					args: [
						useFlytrapFunction((u) => u === 13, {
							id: '/file.js-_anonymous'
						})
					],
					name: 'find'
				})
				if (!foundUser) {
					// `capture` here
					caughtExecutingFunctionId = getExecutingFunction()?.id
				}
			},
			{ id: '/file.js-_GET' }
		)
		GET()

		expect(caughtExecutingFunctionId).toEqual(`/file.js-_GET`)
	})

	it.todo('captures errors inside the function call')
})

describe('storage', () => {
	beforeEach(() => {
		clearFlytrapStorage()
	})

	it.skip('limits captures to 4mb', () => {
		function mockFunction(...args: any[]) {
			return args
		}
		for (let i = 0; i < 20000; i++) {
			useFlytrapCall(mockFunction, {
				args: [{ foo: 'foo', bar: 'bar', baz: 'baz' }],
				id: 'mockFunction',
				name: 'mockFunction'
			})
		}

		// whole capture less than 4mb
		// expect(captureStringified.length).toBeLessThan(4_000_000)
	})
})
