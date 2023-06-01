import { describe, expect, it } from 'vitest'
import { fillUnserializableFlytrapValues } from '../src/core/util'
import { FLYTRAP_REPLACE_VALUES } from '../src/core/constants'

describe('Replay args', () => {
	const mockReplaceValue = {
		hello: 'world'
	}

	it('fills strings', () => {
		FLYTRAP_REPLACE_VALUES.forEach((replaceValue) => {
			expect(fillUnserializableFlytrapValues(replaceValue, 'hello world')).toStrictEqual(
				'hello world'
			)
		})
	})

	it('fills numbers', () => {
		FLYTRAP_REPLACE_VALUES.forEach((replaceValue) => {
			expect(fillUnserializableFlytrapValues(replaceValue, 1)).toStrictEqual(1)
		})
	})

	it('fills arrays', () => {
		FLYTRAP_REPLACE_VALUES.forEach((replaceValue) => {
			expect(fillUnserializableFlytrapValues([replaceValue], [mockReplaceValue])).toStrictEqual([
				mockReplaceValue
			])
			expect(
				fillUnserializableFlytrapValues(
					[replaceValue, replaceValue],
					[mockReplaceValue, mockReplaceValue]
				)
			).toStrictEqual([mockReplaceValue, mockReplaceValue])
		})
	})

	it('works with null and undefined', () => {
		expect(fillUnserializableFlytrapValues(undefined, [mockReplaceValue])).toStrictEqual([
			mockReplaceValue
		])
		expect(fillUnserializableFlytrapValues(null, [mockReplaceValue])).toStrictEqual([
			mockReplaceValue
		])
	})

	it('throws when matching keys not same shape', () => {
		FLYTRAP_REPLACE_VALUES.forEach((replaceValue) => {
			expect(() =>
				fillUnserializableFlytrapValues({ hello: [replaceValue] }, { hello: mockReplaceValue })
			).toThrow()

			expect(() =>
				fillUnserializableFlytrapValues(
					{ hello: [replaceValue], world: [] },
					{ hello: [mockReplaceValue] }
				)
			).not.toThrow()

			expect(() =>
				fillUnserializableFlytrapValues({ hello: replaceValue, world: [] }, { mockReplaceValue })
			).toThrow()
		})
	})

	it('fills objects', () => {
		FLYTRAP_REPLACE_VALUES.forEach((replaceValue) => {
			const lackingObj = { hello: replaceValue, otherKey: '' }
			expect(
				fillUnserializableFlytrapValues(lackingObj, { hello: mockReplaceValue, otherKey: '' })
			).toStrictEqual({
				hello: mockReplaceValue,
				otherKey: ''
			})

			const lackingObjDeep = {
				hello: { world: { deep: replaceValue } },
				otherKey: ''
			}
			const fillObjDeep = { hello: { world: { deep: { hello: 'world' } } }, otherKey: '' }
			const fillObjDeepWrong = { deep: { hello: 'world' } }
			expect(fillUnserializableFlytrapValues(lackingObjDeep, fillObjDeep)).toStrictEqual({
				...fillObjDeep,
				otherKey: ''
			})
			expect(() => fillUnserializableFlytrapValues(lackingObjDeep, fillObjDeepWrong)).toThrow()
		})
	})
})
