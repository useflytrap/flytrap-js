import babelTraverse from '@babel/traverse'
import type { NodePath } from '@babel/traverse'
import {
	Expression,
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
	VariableDeclarator
} from '@babel/types'
import { parse, print } from 'recast'
import babelTsParser from 'recast/parsers/babel-ts.js'
import { getCoreExports } from './imports'
import {
	extractCurrentScope,
	extractFunctionCallId,
	extractFunctionCallName,
	extractFunctionId,
	extractFunctionName
} from './artifacts/artifacts'
import { findIgnoredImports, shouldIgnoreCall } from './packageIgnores'

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
 * An interop function to make babel's exports work
 * @param fn default export from `@babel/traverse`
 * @returns the correct traverse function
 */
function _babelInterop(fn: typeof babelTraverse): typeof babelTraverse {
	// @ts-ignore
	return fn.default ?? fn
}

export function flytrapTransformArtifacts(
	code: string,
	filePath: string,
	packageIgnores?: string[]
) {
	const ast = parse(code, { parser: babelTsParser })
	const ignoredImports = packageIgnores ? findIgnoredImports(code, packageIgnores) : undefined

	_babelInterop(babelTraverse)(ast, {
		ArrowFunctionExpression(path) {
			if (!shouldBeWrapped(path)) return

			const functionName = extractFunctionName(path.parent as VariableDeclarator | ObjectProperty)
			const scopes = extractCurrentScope(path)
			const functionId = extractFunctionId(path, filePath, functionName, scopes)

			const newNode = callExpression(identifier('useFlytrapFunction'), [
				path.node,
				objectExpression([objectProperty(identifier('id'), stringLiteral(functionId))])
			])

			path.replaceWith(newNode)
		},
		FunctionDeclaration(path) {
			if (!shouldBeWrapped(path)) return

			const functionName = extractFunctionName(path.node)
			const scopes = extractCurrentScope(path)
			const functionId = extractFunctionId(path, filePath, functionName, scopes)

			const useFlytrapCallExpressionNode = callExpression(identifier('useFlytrapFunction'), [
				toExpression(path.node),
				objectExpression([objectProperty(identifier('id'), stringLiteral(functionId))])
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
					callExpression(identifier('useFlytrapFunction'), [
						toExpression(path.node),
						objectExpression([objectProperty(identifier('id'), stringLiteral(functionId))])
					])
				)
			])

			path.replaceWith(transformedNode)
		},
		FunctionExpression(path) {
			if (!shouldBeWrapped(path)) return
			if (isVariableDeclarator(path.parent)) {
				const functionName =
					path.node.id?.name ??
					extractFunctionName(path.parent as VariableDeclarator | ObjectProperty)
				const scopes = extractCurrentScope(path)
				const functionId = extractFunctionId(path, filePath, functionName, scopes)

				const transformedNode = callExpression(identifier('useFlytrapFunction'), [
					path.node,
					objectExpression([objectProperty(identifier('id'), stringLiteral(functionId))])
				])
				path.replaceWith(transformedNode)
			}
		},
		// For FlytrapFunctionCall
		CallExpression(path) {
			if (!shouldBeWrapped(path)) return

			// Ignored calls (eg. packageIgnores & reserved words)
			if (shouldIgnoreCall(path, ignoredImports ?? [])) {
				return
			}

			const functionCallName = extractFunctionCallName(path.node)
			const scopes = extractCurrentScope(path)
			const functionCallId = extractFunctionCallId(path, filePath, functionCallName, scopes)
			const useFunctionName = isAwaitExpression(path.parent)
				? 'useFlytrapCallAsync'
				: 'useFlytrapCall'

			function transformCallee(callee: V8IntrinsicIdentifier | Expression) {
				if (callee.type === 'MemberExpression') {
					return callee.object
				}
				return callee
			}

			const newNode = callExpression(identifier(useFunctionName), [
				// @ts-ignore
				transformCallee(path.node.callee),
				objectExpression([
					objectProperty(identifier('id'), stringLiteral(functionCallId)),
					// @ts-ignore
					objectProperty(identifier('args'), arrayExpression(path.node.arguments)),
					objectProperty(identifier('name'), stringLiteral(functionCallName))
				])
			])
			path.replaceWith(newNode)
		}
	})

	return print(ast, { quote: 'single' })
}
