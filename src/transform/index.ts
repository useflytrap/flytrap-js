import babelTraverse from '@babel/traverse'
import type { NodePath } from '@babel/traverse'
import {
	variableDeclarator,
	isVariableDeclarator,
	objectProperty,
	arrayExpression,
	stringLiteral,
	isAwaitExpression,
	toExpression,
	variableDeclaration,
	callExpression,
	identifier,
	isCallExpression,
	isIdentifier,
	objectExpression,
	V8IntrinsicIdentifier,
	ObjectProperty,
	VariableDeclarator,
	MemberExpression,
	isMemberExpression,
	isNumericLiteral,
	isStringLiteral,
	Identifier
} from '@babel/types'
import generate from '@babel/generator'

import { getCoreExports } from './imports'
import {
	extractCurrentScope,
	extractFunctionCallId,
	extractFunctionCallName,
	extractFunctionId,
	extractFunctionName
} from './artifacts/artifacts'
import { findIgnoredImports, shouldIgnoreCall } from './packageIgnores'
import { shouldIgnoreFunctionName } from './excludes'
import { FlytrapConfig } from '../core/types'
import { _babelInterop } from './util'
import { parseCode } from './parser'
import { createHumanLog } from '../core/errors'
import { log } from '../core/logging'

export function getCalleeAndAccessorKey(node: MemberExpression | Identifier) {
	if (!isMemberExpression(node)) {
		return {
			callee: node,
			accessorKey: undefined
		}
	}

	// @ts-expect-error
	const callee: MemberExpression | Identifier = node.object

	let accessorKey = node.property

	if (!node.computed) {
		if (isIdentifier(node.property)) {
			accessorKey = stringLiteral(node.property.name)
		}
		if (isNumericLiteral(node.property) || isStringLiteral(node.property)) {
			accessorKey = stringLiteral(String(node.property.value))
		}
	}

	return { callee, accessorKey }
}

export function shouldBeWrappedUff(path: NodePath) {
	if (
		isCallExpression(path.parent) &&
		isIdentifier(path.parent.callee) &&
		['uff'].includes(path.parent.callee.name)
	) {
		return false
	}

	if (
		isCallExpression(path.node) &&
		// @ts-ignore
		getCoreExports().includes(path.node.callee.name)
	) {
		return false
	}
	return true
}

export function shouldBeWrapped(path: NodePath) {
	if (
		isCallExpression(path.parent) &&
		isIdentifier(path.parent.callee) &&
		['useFlytrapFunction', 'useFlytrapFunctionAsync'].includes(path.parent.callee.name)
	) {
		return false
	}

	if (
		isCallExpression(path.node) &&
		// @ts-ignore
		getCoreExports().includes(path.node.callee.name)
	) {
		return false
	}
	return true
}

/**
 * Transforms code using the new more minimal `uff` wrapper.
 * @param code
 * @param filePath
 * @param config
 * @returns The generated code and sourcemap
 */
export function flytrapTransformUff(
	code: string,
	filePath: string,
	config?: Partial<FlytrapConfig>
) {
	const parseResult = parseCode(code, filePath, config?.babel?.parserOptions)

	if (parseResult.err) {
		log.error('error', parseResult.val.toString())
		throw new Error(parseResult.val.toString())
	}

	const ast = parseResult.val

	const ignoredImports = config?.packageIgnores
		? findIgnoredImports(code, config.packageIgnores)
		: undefined

	try {
		_babelInterop(babelTraverse)(ast, {
			...(!config?.transformOptions?.disableTransformation?.includes('arrow-function') && {
				ArrowFunctionExpression(path) {
					if (!shouldBeWrappedUff(path)) return

					const functionName = extractFunctionName(
						path.parent as VariableDeclarator | ObjectProperty
					)
					const scopes = extractCurrentScope(path)
					const functionId = extractFunctionId(path, filePath, functionName, scopes)

					const newNode = callExpression(identifier('uff'), [path.node, stringLiteral(functionId)])

					path.replaceWith(newNode)
				}
			}),

			...(!config?.transformOptions?.disableTransformation?.includes('function-declaration') && {
				FunctionDeclaration(path) {
					if (!shouldBeWrappedUff(path)) return

					const functionName = extractFunctionName(path.node)
					const scopes = extractCurrentScope(path)
					const functionId = extractFunctionId(path, filePath, functionName, scopes)

					const useFlytrapCallExpressionNode = callExpression(identifier('uff'), [
						toExpression(path.node),
						stringLiteral(functionId)
						// objectExpression([objectProperty(identifier('id'), stringLiteral(functionId))])
					])

					// Handle default export
					if (path.parent.type === 'ExportDefaultDeclaration') {
						path.replaceWith(useFlytrapCallExpressionNode)
						return
					}

					const transformedNode = variableDeclaration('const', [
						variableDeclarator(
							// @ts-ignore
							identifier(path.node.id.name),
							callExpression(identifier('uff'), [
								toExpression(path.node),
								stringLiteral(functionId)
								// objectExpression([objectProperty(identifier('id'), stringLiteral(functionId))])
							])
						)
					])

					path.replaceWith(transformedNode)
				}
			}),

			...(!config?.transformOptions?.disableTransformation?.includes('function-expression') && {
				FunctionExpression(path) {
					if (!shouldBeWrappedUff(path)) return
					if (isVariableDeclarator(path.parent)) {
						const functionName =
							path.node.id?.name ??
							extractFunctionName(path.parent as VariableDeclarator | ObjectProperty)
						const scopes = extractCurrentScope(path)
						const functionId = extractFunctionId(path, filePath, functionName, scopes)

						const transformedNode = callExpression(identifier('uff'), [
							path.node,
							stringLiteral(functionId)
							// objectExpression([objectProperty(identifier('id'), stringLiteral(functionId))])
						])
						path.replaceWith(transformedNode)
					}
				}
			}),

			...(!config?.transformOptions?.disableTransformation?.includes('call-expression') && {
				CallExpression(path) {
					if (!shouldBeWrappedUff(path)) return

					// Ignored calls (eg. packageIgnores & reserved words)
					if (
						shouldIgnoreCall(path, ignoredImports ?? []) ||
						shouldIgnoreFunctionName(path, config?.excludeFunctionNames ?? [])
					) {
						return
					}

					const fullFunctionCallName = _babelInterop(generate)({
						...path.node,
						arguments: []
					}).code.replaceAll('()', '')

					if (fullFunctionCallName === 'this' || fullFunctionCallName.split('.').at(0) === 'this') {
						return
					}
					const functionCallName = fullFunctionCallName.split('.').at(-1)!
					const scopes = extractCurrentScope(path)
					const functionCallId = extractFunctionCallId(path, filePath, functionCallName, scopes)
					const useFunctionName = isAwaitExpression(path.parent) ? 'ufc' : 'ufc'

					// @ts-ignore
					const { callee, accessorKey } = getCalleeAndAccessorKey(path.node.callee)

					if (!callee) {
						throw new Error('Callee is undefined. CODE: ' + generate(path.node).code)
					}

					const newNode = callExpression(identifier(useFunctionName), [
						callee,
						objectExpression([
							objectProperty(identifier('id'), stringLiteral(functionCallId)),
							// @ts-ignore
							objectProperty(identifier('args'), arrayExpression(path.node.arguments)),
							objectProperty(
								identifier('name'),
								// @ts-expect-error
								accessorKey ? accessorKey : stringLiteral(functionCallName)
							)
						])
					])

					path.replaceWith(newNode)
				}
			})
		})
	} catch (e) {
		const errorLog = createHumanLog({
			events: ['transform_file_failed'],
			explanations: ['traverse_failed'],
			solutions: ['open_issue'],
			params: {
				fileNamePath: filePath,
				traverseError: String(e)
			}
		})

		throw errorLog.toString()
	}

	return _babelInterop(generate)(ast)
}
