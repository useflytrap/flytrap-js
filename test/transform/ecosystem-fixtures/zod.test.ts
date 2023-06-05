import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { useFlytrapCall, useFlytrapCallAsync, useFlytrapFunction } from '../../../src/index'

describe('Zod', () => {
	it('works with chained schemas', () => {
		// @flytrap-transform-start
		const urlSchema = z.string().url()
		// @flytrap-transform-end

		expect(urlSchema.safeParse('invalid url').success).toBe(false)
		expect(urlSchema.safeParse('https://www.useflytrap.com').success).toBe(true)
	})
})
