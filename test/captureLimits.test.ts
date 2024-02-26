import { describe, expect, it } from 'vitest'
import { parseCaptureAmountLimit, parseFilepathFromFunctionId } from '../src/core/util'
import { CapturedCall } from '../src/core/types'
import { getLimitedCaptures, getSizeLimitedCaptures } from '../src/core/captureLimits'
import { copy } from 'copy-anything'
import { serializeError } from 'serialize-error'

const createData = (bytes: number) => {
	return 'H'.repeat(bytes)
}

const callsFixture: CapturedCall[] = [
	{
		id: '/a.js-call-_a',
		invocations: [1, 2].map((timestamp) => ({
			args: [],
			output: createData(2),
			timestamp
		}))
	},
	{
		id: '/b.js-call-_b',
		invocations: [3, 4, 5, 6, 7].map((timestamp) => ({
			args: [],
			output: createData(2),
			timestamp
		}))
	},
	{
		id: '/c.js-call-_c',
		invocations: [8, 9].map((timestamp) => ({
			args: [],
			output: createData(2),
			timestamp
		}))
	}
]

describe('capture limits', () => {
	it('parseCaptureAmountLimit', () => {
		expect(parseCaptureAmountLimit(`3 files`).val).toStrictEqual({
			type: 'files',
			fileLimit: 3
		})
		expect(parseCaptureAmountLimit(`3files`).val).toStrictEqual({
			type: 'files',
			fileLimit: 3
		})
		expect(parseCaptureAmountLimit(`128kb`).val).toStrictEqual({
			type: 'size',
			sizeLimit: 128000
		})
		expect(parseCaptureAmountLimit(`1.5mb`).val).toStrictEqual({
			type: 'size',
			sizeLimit: 1_500_000
		})

		// Errors
		expect(parseCaptureAmountLimit(`0 files`).val).toBe(
			`Invalid capture amount limit "0 files". Number of files to capture must be greater than 0.`
		)
		expect(parseCaptureAmountLimit(`0 kb`).val).toBe(
			`Invalid capture amount limit "0 kb". The minimum size to capture is 128 bytes.`
		)
		// @ts-expect-error
		expect(parseCaptureAmountLimit(`invalid`).val).toBe(
			`Invalid capture amount limit "invalid". Valid values are file-based capture limits (eg. '3 files') or file-size based capture limits (eg. '2mb')`
		)
	})

	it('parseFilepathFromFunctionId', () => {
		const basePath = 'src/components/ui/CapturedCall.tsx'

		expect(parseFilepathFromFunctionId(`${basePath}-call-_foo`).val).toBe(basePath)
		expect(parseFilepathFromFunctionId(`${basePath}-_foo`).val).toBe(basePath)
		expect(parseFilepathFromFunctionId(`${basePath}`).val).toBe(
			`Invalid function ID "src/components/ui/CapturedCall.tsx".`
		)
		expect(parseFilepathFromFunctionId(``).val).toBe(`Invalid function ID "".`)
	})

	it('saves everything when capture limit is more than data', () => {
		const limitedResult = getSizeLimitedCaptures(callsFixture, 6_000).unwrap()
		const { calls: newCalls } = limitedResult
		expect(newCalls).toStrictEqual(callsFixture.slice().reverse())
	})

	it('gives priority to function calls and functions that contain errors', () => {
		const callsFixtureCopy = copy(callsFixture)

		const SERIALIZATION_ADDON = 46 * 3
		const limitedResult = getSizeLimitedCaptures(callsFixtureCopy, 2 + SERIALIZATION_ADDON).unwrap()
		const { calls } = limitedResult

		expect(calls.find((c) => c.id === '/a.js-call-_a')).toBe(undefined)

		const serializedError = serializeError(new Error('Hello World'))

		// Add error
		callsFixtureCopy[0].invocations[0] = {
			args: [],
			output: createData(2),
			timestamp: 1,
			error: serializedError
		}

		const limitedResultWithError = getSizeLimitedCaptures(
			callsFixtureCopy,
			2 + SERIALIZATION_ADDON
		).unwrap()
		const { calls: callsWithError } = limitedResultWithError

		expect(callsWithError.find((c) => c.id === '/a.js-call-_a')?.invocations).toStrictEqual([
			{
				args: [],
				output: createData(2),
				timestamp: 1,
				error: serializedError
			}
		])

		/* const SERIALIZATION_ADDON = 46 * 3
		const limitedResult = getSizeLimitedCaptures(callsFixtureCopy, 2 + SERIALIZATION_ADDON).unwrap()
		const { calls } = limitedResult */

		// Calls should have the errored invocation

		// Simplest to just add all invocations that contain errors after the capture limiting has been done?

		// Btw, this should apply also to the `files` thing?
		// Files is dumb?
	})

	it('adds most recent calls first', () => {
		const SERIALIZATION_ADDON = 46 * 1
		const limitedResult = getSizeLimitedCaptures(callsFixture, 2 + SERIALIZATION_ADDON).unwrap()
		const { calls: newCalls } = limitedResult

		expect(newCalls).toStrictEqual([
			{
				id: '/c.js-call-_c',
				invocations: [9].map((timestamp) => ({
					args: [],
					output: createData(2),
					timestamp
				}))
			}
		])
	})

	it('does capture limiting depth (functions & calls) first, instead of bredth first (invocations)', () => {
		const SERIALIZATION_ADDON = 46 * 3
		const limitedResult = getSizeLimitedCaptures(callsFixture, 6 + SERIALIZATION_ADDON).unwrap()
		const { calls: newCalls } = limitedResult

		expect(newCalls.length).toBe(3)
		expect(newCalls).toStrictEqual([
			{
				id: '/c.js-call-_c',
				invocations: [9].map((timestamp) => ({
					args: [],
					output: createData(2),
					timestamp
				}))
			},
			{
				id: '/b.js-call-_b',
				invocations: [7].map((timestamp) => ({
					args: [],
					output: createData(2),
					timestamp
				}))
			},
			{
				id: '/a.js-call-_a',
				invocations: [2].map((timestamp) => ({
					args: [],
					output: createData(2),
					timestamp
				}))
			}
		])

		// Extra serialization bytes * num functions * num invocations
		const SERIALIZATION_ADDON_SECOND = 46 * 3 * 2

		const { calls: secondTestCaseCalls } = getSizeLimitedCaptures(
			callsFixture,
			12 + SERIALIZATION_ADDON_SECOND
		).unwrap()
		expect(secondTestCaseCalls.length).toBe(3)
		expect(secondTestCaseCalls).toStrictEqual([
			{
				id: '/c.js-call-_c',
				invocations: [8, 9].map((timestamp) => ({
					args: [],
					output: createData(2),
					timestamp
				}))
			},
			{
				id: '/b.js-call-_b',
				invocations: [6, 7].map((timestamp) => ({
					args: [],
					output: createData(2),
					timestamp
				}))
			},
			{
				id: '/a.js-call-_a',
				invocations: [1, 2].map((timestamp) => ({
					args: [],
					output: createData(2),
					timestamp
				}))
			}
		])
	})
})
