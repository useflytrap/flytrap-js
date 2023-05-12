import {
	useFlytrapFunction,
	useFlytrapCall,
	_resetExecutingFunctions,
	_resetFunctionCalls,
	getFunctionCalls
} from 'useflytrap'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { walk } from '../src/core/stringify'

describe('stringifying unserialzable values', () => {
	it('handles cyclical dependencies', () => {
		const b = {}
		const a = {
			b: b
		}
		// a.b = a

		walk(a, {})
	})
})
