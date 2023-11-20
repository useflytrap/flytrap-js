import { describe, expect, it } from 'vitest'
import { parseCaptureAmountLimit, parseFilepathFromFunctionId } from '../src/core/util'

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
})
