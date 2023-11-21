import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { uff, ufc } from '../../../src/index'

describe('Supabase', () => {
	it('works with Supabase', async () => {
		// @flytrap-transform-start
		const supabase = createClient('https://kaxxpswcdwvhjgozvedt.supabase.co', 'invalid api key')
		const { error } = await supabase.from('Users').select('*')
		// @flytrap-transform-end

		expect(error).toEqual({
			message: 'Invalid API key',
			hint: 'Double check your Supabase `anon` or `service_role` API key.'
		})
	})
})
