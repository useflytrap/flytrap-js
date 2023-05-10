import {
	useFlytrapFunction,
	useFlytrapCall,
	_resetExecutingFunctions,
	_resetFunctionCalls,
	getFunctionCalls
} from 'useflytrap'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

describe('useFlytrapFunction capture', () => {
	it.todo('captures errors inside the wrapped function')
})

function clearFlytrapStorage() {
	// TODO: move this to actual flytrap storage
	_resetExecutingFunctions()
	_resetFunctionCalls()
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
			name: 'log',
			filePath: '/file.js',
			lineNumber: 1,
			scopes: []
		})

		expect(getFunctionCalls()).toStrictEqual([
			{
				args: ['hello', 'world'],
				id: '/file.js-console.log',
				name: 'log',
				output: undefined,
				scopes: [],
				source: {
					filePath: '/file.js',
					lineNumber: 1
				},
				timestamp: 0
			}
		])
	})

	it('forwards values', () => {
		const fixture = {
			hello: {
				world: useFlytrapFunction(() => 2, {
					id: 'someid',
					filePath: '/',
					lineNumber: 3,
					name: 'world',
					scopes: []
				})
			}
		}

		const returnVal = useFlytrapCall(fixture.hello, {
			id: '/file.js-hello.world',
			args: [],
			name: 'world',
			filePath: '/',
			lineNumber: 1,
			scopes: []
		})
		expect(returnVal).toBe(2)
	})

	it.todo('captures errors inside the function call')
})

import { createClient } from '@supabase/supabase-js'

describe('Supabase', () => {
	it('database fetching works', async () => {
		const supabase = createClient('https://kaxxpswcdwvhjgozvedt.supabase.co', 'invalid api key')
		const { error } = await supabase.from('Capture').select('*')

		expect(error).toStrictEqual({
			message: 'Invalid API key',
			hint: 'Double check your Supabase `anon` or `service_role` API key.'
		})
	})
})

describe('Zod', () => {
	it('handles chained schemas', () => {
		const urlSchema = z.string().url()

		expect(urlSchema.safeParse('invalid url').success).toBe(false)
		expect(urlSchema.safeParse('https://www.useflytrap.com').success).toBe(true)
	})
})
