import { describe, expect, it } from 'vitest'
import { fillUnserializableFlytrapValues } from '../src/core/util'
import { FLYTRAP_UNSERIALIZABLE_VALUE } from '../src/core/constants'

describe('Replay args', () => {
	const mockReplaceValue = {
		hello: 'world'
	}

	it('fills strings', () => {
		expect(
			fillUnserializableFlytrapValues(FLYTRAP_UNSERIALIZABLE_VALUE, 'hello world')
		).toStrictEqual('hello world')
	})

	it('fills numbers', () => {
		expect(fillUnserializableFlytrapValues(FLYTRAP_UNSERIALIZABLE_VALUE, 1)).toStrictEqual(1)
	})

	it('fills arrays', () => {
		expect(
			fillUnserializableFlytrapValues([FLYTRAP_UNSERIALIZABLE_VALUE], [mockReplaceValue])
		).toStrictEqual([mockReplaceValue])
		expect(
			fillUnserializableFlytrapValues(
				[FLYTRAP_UNSERIALIZABLE_VALUE, FLYTRAP_UNSERIALIZABLE_VALUE],
				[mockReplaceValue, mockReplaceValue]
			)
		).toStrictEqual([mockReplaceValue, mockReplaceValue])
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
		expect(() =>
			fillUnserializableFlytrapValues(
				{ hello: [FLYTRAP_UNSERIALIZABLE_VALUE] },
				{ hello: mockReplaceValue }
			)
		).toThrow()

		expect(() =>
			fillUnserializableFlytrapValues(
				{ hello: [FLYTRAP_UNSERIALIZABLE_VALUE], world: [] },
				{ hello: [mockReplaceValue] }
			)
		).not.toThrow()

		expect(() =>
			fillUnserializableFlytrapValues(
				{ hello: FLYTRAP_UNSERIALIZABLE_VALUE, world: [] },
				{ mockReplaceValue }
			)
		).toThrow()
	})

	it('fills objects', () => {
		const lackingObj = { hello: FLYTRAP_UNSERIALIZABLE_VALUE, otherKey: '' }
		expect(
			fillUnserializableFlytrapValues(lackingObj, { hello: mockReplaceValue, otherKey: '' })
		).toStrictEqual({
			hello: mockReplaceValue,
			otherKey: ''
		})

		const lackingObjDeep = {
			hello: { world: { deep: FLYTRAP_UNSERIALIZABLE_VALUE } },
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
