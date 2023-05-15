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
	isMemberExpression,
	objectExpression,
	numericLiteral,
	Node,
	isFunctionExpression,
	V8IntrinsicIdentifier,
	ObjectExpression,
	ObjectProperty,
	StringLiteral,
	Identifier
} from '@babel/types'
import { parse, print } from 'recast'
import babelTsParser from 'recast/parsers/babel-ts.js'
import { getCoreExports } from './imports'

function getAvailableCallId(
	filePath: string,
	scopes: string[],
	functionName: string,
	takenCallIds: string[]
): string {
	const baseCallId = [filePath, ...scopes, functionName].join('-')
	let callId = baseCallId
	let number = 1
	while (takenCallIds.includes(callId)) {
		number++
		callId = `${baseCallId}-${number}`
	}
	return callId
}

function getAvailableFunctionId(
	filePath: string,
	scopes: string[],
	functionName: string,
	takenFuncIds: string[]
): string {
	const baseFuncId = [filePath, ...scopes, functionName].join('-')
	let funcId = baseFuncId
	let number = 1
	while (takenFuncIds.includes(funcId)) {
		number++
		funcId = `${baseFuncId}-${number}`
	}
	return funcId
}

function getFunctionName(callee: Expression): string {
	if (isIdentifier(callee)) {
		return callee.name
	} else if (isMemberExpression(callee)) {
		// @ts-ignore
		return `${getFunctionName(callee.object)}.${callee.property.name}`
	}
	return '(anonymous)'
}

function shouldBeWrapped(path: NodePath) {
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

function getLineNumber(node: Node) {
	// @ts-ignore
	return node.loc?.start?.line ?? node.body?.loc?.start?.line ?? node.callee?.loc?.start?.line ?? -1
}

function getWrappingFunctionId(path: NodePath<Node>): string | undefined {
	let currentPath = path
	while (currentPath.parentPath) {
		currentPath = currentPath.parentPath

		if (
			currentPath.node.type === 'CallExpression' &&
			// @ts-ignore
			currentPath.node.callee.name === 'useFlytrapFunction'
		) {
			// Now let's extract the function ID
			const functionOpts = currentPath.node.arguments?.[1] as ObjectExpression
			if (!functionOpts) return undefined

			const functionIdNode = functionOpts.properties.find(
				// @ts-ignore
				(prop) => prop?.key?.name === 'id'
			) as ObjectProperty
			const functionId = (functionIdNode.value as StringLiteral)?.value
			return functionId
		}
	}
	return undefined
}

function getScopes(path: NodePath<Node>) {
	let currentPath = path
	const scopes: string[] = []
	while (currentPath.parentPath) {
		currentPath = currentPath.parentPath
		if (currentPath.node.type === 'BlockStatement') {
			if (isFunctionExpression(currentPath.parent)) {
				scopes.push(currentPath?.parent?.id?.name ?? 'BlockStatement')
			} else if (currentPath.parent.type === 'ArrowFunctionExpression') {
				// Handle arrow function case
				let _innerCurrentPath: NodePath<Node> | null = currentPath
				while (_innerCurrentPath && _innerCurrentPath.type !== 'VariableDeclarator') {
					_innerCurrentPath = _innerCurrentPath?.parentPath
				}
				if (_innerCurrentPath && _innerCurrentPath.type === 'VariableDeclarator') {
					// @ts-ignore
					scopes.push(_innerCurrentPath.node?.id?.name ?? 'BlockStatement')
				}
			} else {
				scopes.push('BlockStatement')
			}
		}
	}
	return scopes.reverse()
}

export function flytrapTransform(code: string, filePath: string) {
	const ast = parse(code, { parser: babelTsParser })

	const takenCallIds: string[] = []
	const takenFunctionIds: string[] = []
	const takenFunctionNames: string[] = []

	_babelInterop(babelTraverse)(ast, {
		ArrowFunctionExpression(path) {
			if (!shouldBeWrapped(path)) return
			const useFunctionName = 'useFlytrapFunction'
			const scopes = getScopes(path)

			let functionName
			if (path.parent.type === 'ObjectProperty') {
				// @ts-ignore
				functionName = path.parent.key.name
			}
			if (path.parent.type === 'VariableDeclarator') {
				// @ts-ignore
				functionName = path.parent.id.name
			}
			if (!functionName) {
				functionName = 'anonymous'
			}

			// derive function ID
			const functionId = getAvailableFunctionId(filePath, scopes, functionName, takenFunctionIds)
			takenFunctionIds.push(functionId)

			const newNode = callExpression(identifier(useFunctionName), [
				path.node,
				objectExpression([
					objectProperty(identifier('id'), stringLiteral(functionId)),
					objectProperty(identifier('name'), stringLiteral(functionName)),
					objectProperty(identifier('filePath'), stringLiteral(filePath)),
					objectProperty(identifier('lineNumber'), numericLiteral(getLineNumber(path.node))),
					objectProperty(
						identifier('scopes'),
						arrayExpression(scopes.map((scope) => stringLiteral(scope)))
					)
				])
			])

			path.replaceWith(newNode)
		},
		FunctionDeclaration(path) {
			if (!shouldBeWrapped(path)) return
			// const useFunctionName = path.node.async ? 'useFlytrapFunctionAsync' : 'useFlytrapFunction'
			const useFunctionName = 'useFlytrapFunction'
			const scopes = getScopes(path)

			const functionName = path.node.id ? path.node.id.name : 'anonymous'

			// derive function ID
			const functionId = getAvailableFunctionId(filePath, scopes, functionName, takenFunctionIds)
			takenFunctionIds.push(functionId)

			// case for default exports
			if (path.parent.type === 'ExportDefaultDeclaration') {
				const newNode = callExpression(identifier(useFunctionName), [
					toExpression(path.node),
					objectExpression([
						objectProperty(identifier('id'), stringLiteral(functionId)),
						// @ts-ignore
						// objectProperty(identifier('name'), stringLiteral(path.node.id.name)),
						objectProperty(
							identifier('name'),
							path.node.id ? stringLiteral(path.node.id.name) : stringLiteral(functionName)
						),
						objectProperty(identifier('filePath'), stringLiteral(filePath)),
						objectProperty(identifier('lineNumber'), numericLiteral(getLineNumber(path.node))),
						objectProperty(
							identifier('scopes'),
							arrayExpression(scopes.map((scope) => stringLiteral(scope)))
						)
					])
				])
				path.replaceWith(newNode)
				return
			}

			const newNode = variableDeclaration('const', [
				variableDeclarator(
					// @ts-ignore
					identifier(path.node.id.name),
					callExpression(identifier(useFunctionName), [
						toExpression(path.node),
						objectExpression([
							objectProperty(identifier('id'), stringLiteral(functionId)),
							// @ts-ignore
							objectProperty(identifier('name'), stringLiteral(path.node.id.name)),
							objectProperty(identifier('filePath'), stringLiteral(filePath)),
							objectProperty(identifier('lineNumber'), numericLiteral(getLineNumber(path.node))),
							objectProperty(
								identifier('scopes'),
								arrayExpression(scopes.map((scope) => stringLiteral(scope)))
							)
						])
					])
				)
			])
			path.replaceWith(newNode)
		},
		FunctionExpression(path) {
			if (!shouldBeWrapped(path)) return
			if (isVariableDeclarator(path.parent)) {
				const useFunctionName = 'useFlytrapFunction'
				const scopes = getScopes(path)

				let functionName
				if (path.parent.type === 'VariableDeclarator') {
					// @ts-ignore
					functionName = path.parent.id.name
				}
				if (!functionName) {
					functionName = 'anonymous'
				}

				// derive function ID
				const functionId = getAvailableFunctionId(filePath, scopes, functionName, takenFunctionIds)
				takenFunctionIds.push(functionId)

				const newNode = callExpression(identifier(useFunctionName), [
					path.node,
					objectExpression([
						objectProperty(identifier('id'), stringLiteral(functionId)),
						// @ts-ignore
						objectProperty(identifier('name'), stringLiteral(functionName)),
						objectProperty(identifier('filePath'), stringLiteral(filePath)),
						objectProperty(identifier('lineNumber'), numericLiteral(getLineNumber(path.node))),
						objectProperty(
							identifier('scopes'),
							arrayExpression(scopes.map((scope) => stringLiteral(scope)))
						)
					])
				])
				path.replaceWith(newNode)
			}
		},
		// For FlytrapFunctionCall
		CallExpression(path) {
			if (!shouldBeWrapped(path)) return
			// @ts-ignore
			let functionPath = getFunctionName(path.node.callee)
			let functionName: string | undefined
			const useFunctionName = isAwaitExpression(path.parent)
				? 'useFlytrapCallAsync'
				: 'useFlytrapCall'
			const scopes = getScopes(path)

			const id = getAvailableCallId(filePath, scopes, functionPath, takenCallIds)
			takenCallIds.push(id)

			// Get the function ID of a wrapping Flytrap function if it exists
			const wrappedFunctionId = getWrappingFunctionId(path)

			function transformCallee(callee: V8IntrinsicIdentifier | Expression) {
				if (callee.type === 'MemberExpression') {
					return callee.object
				}
				return callee
			}

			if (functionPath.includes('.')) {
				const lastDotIndex = functionPath.lastIndexOf('.')
				const functionPathPart = functionPath.substring(0, lastDotIndex)
				const functionNamePart = functionPath.substring(lastDotIndex + 1)
				functionName = functionNamePart
				functionPath = functionPathPart
			}

			const newNode = callExpression(identifier(useFunctionName), [
				// @ts-ignore
				transformCallee(path.node.callee),
				// functionPath,
				objectExpression([
					...(wrappedFunctionId
						? [objectProperty(identifier('functionId'), stringLiteral(wrappedFunctionId))]
						: []),
					// @ts-ignore
					objectProperty(identifier('id'), stringLiteral(id)),
					// @ts-ignore
					objectProperty(identifier('args'), arrayExpression(path.node.arguments)),
					// @ts-ignore
					objectProperty(identifier('name'), stringLiteral(functionName ?? functionPath)),
					objectProperty(identifier('filePath'), stringLiteral(filePath)),
					objectProperty(identifier('lineNumber'), numericLiteral(getLineNumber(path.node))),
					objectProperty(
						identifier('scopes'),
						arrayExpression(scopes.map((scope) => stringLiteral(scope)))
					)
				])
			])
			path.replaceWith(newNode)
		}
	})

	return print(ast, { quote: 'single' })
}
