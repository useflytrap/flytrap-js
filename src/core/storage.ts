import { Err, Ok, Result } from 'ts-results'
import { getApiBase, getLoadedConfig } from './config'
import { CapturedCall, CapturedFunction, DatabaseCapture, FlytrapConfig } from './types'
import { empty } from './util'
import { createHumanLog } from './errors'
import { log } from './logging'
import { getLimitedCaptures } from './captureLimits'
import { shouldIgnoreCapture } from './captureIgnores'
import { formatBytes } from './util'
import { clearCapturedCalls, clearCapturedFunctions, getUserId } from '../index'
import {
	newSafeParse,
	newSafeStringify,
	removeCirculars,
	removeUnserializableValues
} from './stringify'
import { decryptCapture, encryptCapture } from './encryption'
import { request } from './requestUtils'

function findWithLatestErrorInvocation<T extends CapturedCall | CapturedFunction>(
	capturedFunctions: T[]
): T | undefined {
	let latestFunction: T | undefined
	let latestTimestamp = -Infinity

	capturedFunctions.forEach((func) => {
		func.invocations.forEach((invocation) => {
			if (invocation.error && invocation.timestamp > latestTimestamp) {
				latestTimestamp = invocation.timestamp
				latestFunction = func
			}
		})
	})

	return latestFunction
}

export async function fetchCapture(captureId: string, secretApiKey: string, privateKey: string) {
	const fetchCaptureResult = await request<DatabaseCapture>(
		`${getApiBase()}/api/v1/captures/${captureId}`,
		'GET',
		undefined,
		{
			headers: new Headers({
				Accept: 'application/json',
				Authorization: `Bearer ${secretApiKey}`
			})
		}
	)

	if (fetchCaptureResult.err) {
		return fetchCaptureResult
	}

	return await decryptCapture(fetchCaptureResult.val, privateKey)
}

export async function saveCapture(
	functions: CapturedFunction[],
	calls: CapturedCall[],
	error?: any,
	config?: FlytrapConfig
) {
	if (!config) {
		config = getLoadedConfig()
	}

	if (config && config.mode === 'troubleshoot') {
		const lastErroredFunction = findWithLatestErrorInvocation(functions)
		const lastErroredCall = findWithLatestErrorInvocation(calls)

		const troubleshootingErrorLog = createHumanLog({
			events: ['troubleshooting_error_captured'],
			explanations: ['troubleshooting_capture_explanation'],
			solutions: ['troubleshooting_open_issue', 'join_discord'],
			params: {
				lastErroredFunctionId: lastErroredFunction?.id ?? 'undefined',
				lastErroredCallId: lastErroredCall?.id ?? 'undefined'
			}
		})

		log.error('error', troubleshootingErrorLog.toString())
		return Err(troubleshootingErrorLog)
	}

	if (
		!config ||
		!config.publicApiKey ||
		!config.projectId ||
		empty(config.publicApiKey, config.projectId)
	) {
		return Err(
			createHumanLog({
				events: ['capture_failed'],
				explanations: ['missing_config_values'],
				solutions: ['configuration_fix']
			})
		)
	}

	calls = removeUnserializableValues(calls)
	functions = removeUnserializableValues(functions)

	const processCallsResult = newSafeStringify(calls).andThen(newSafeParse<CapturedCall[]>)
	if (processCallsResult.err) {
		return processCallsResult
	}

	const processFunctionsResult = newSafeStringify(functions).andThen(
		newSafeParse<CapturedFunction[]>
	)
	if (processFunctionsResult.err) {
		return processFunctionsResult
	}

	calls = processCallsResult.val
	functions = processFunctionsResult.val

	// Remove the circular from `calls` and `functions`
	for (let i = 0; i < calls.length; i++) {
		for (let j = 0; j < calls[i].invocations.length; j++) {
			calls[i].invocations[j].args = calls[i].invocations[j].args.map((a) => removeCirculars(a))
			calls[i].invocations[j].output = removeCirculars(calls[i].invocations[j].output)
		}
	}
	for (let i = 0; i < functions.length; i++) {
		for (let j = 0; j < functions[i].invocations.length; j++) {
			functions[i].invocations[j].args = functions[i].invocations[j].args.map((a) =>
				removeCirculars(a)
			)
			functions[i].invocations[j].output = removeCirculars(functions[i].invocations[j].output)
		}
	}

	// Handle capture amount limits (by default limit at 4mb)
	const limitedCapturesResult = getLimitedCaptures(
		calls,
		functions,
		config?.captureAmountLimit ?? '4mb'
	)

	if (limitedCapturesResult.err) {
		log.error('error', limitedCapturesResult.val.toString())
	} else {
		calls = limitedCapturesResult.val.calls
		functions = limitedCapturesResult.val.functions
	}

	if (!config.buildId) {
		return Err(
			createHumanLog({
				events: ['capture_failed'],
				explanations: ['build_id_undefined'],
				solutions: ['configuration_fix']
			})
		)
	}

	const encryptedCaptureResult = await encryptCapture(
		functions,
		calls,
		config.buildId,
		config.publicApiKey,
		config.projectId,
		getUserId(),
		error
	)

	if (encryptedCaptureResult.err) {
		return encryptedCaptureResult
	}

	// Capture ignores
	if (config.captureIgnores) {
		if (shouldIgnoreCapture(encryptedCaptureResult.val, config.captureIgnores)) {
			log.info('storage', `Ignored capture with name "${encryptedCaptureResult.val.functionName}"`)
			return Ok(undefined)
		}
	}

	// Then payload gets stringified
	const stringifiedPayload = newSafeStringify(encryptedCaptureResult.val)
	if (stringifiedPayload.err) {
		return stringifiedPayload
	}

	const captureRequestResult = await request<{ success: true }>(
		`${getApiBase()}/api/v1/captures`,
		'POST',
		stringifiedPayload.val,
		{
			headers: new Headers({
				Authorization: `Bearer ${config.publicApiKey}`,
				'Content-Type': 'application/json'
			})
		}
	)

	if (captureRequestResult.err) {
		return captureRequestResult
	}

	log.info(
		'storage',
		`Saved capture with name "${
			encryptedCaptureResult.val.functionName
		}". Payload Size: ${formatBytes(stringifiedPayload.val.length)}`
	)

	clearCapturedFunctions()
	clearCapturedCalls()

	return captureRequestResult
}
