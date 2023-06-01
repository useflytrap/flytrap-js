import { SourceType } from '../core/types'
import babelTraverse, { Node, NodePath } from '@babel/traverse'
import { parse, print } from 'recast'
import babelTsParser from 'recast/parsers/babel-ts.js'
import {
	ArrowFunctionExpression,
	CallExpression,
	FunctionDeclaration,
	FunctionExpression,
	Identifier,
	ObjectProperty,
	VariableDeclarator
} from '@babel/types'

export type Artifact = {
	type: 'CALL' | 'FUNCTION'
	functionOrCallId: string
	functionOrCallName: string
	source: SourceType
	scopes: string[]
	params: string
	/**
	 * `functionId` can only defined if `type` === 'CALL'
	 */
	functionId?: string
}

/**
 * An interop function to make babel's exports work
 * @param fn default export from `@babel/traverse`
 * @returns the correct traverse function
 */
export function _babelInterop(fn: typeof babelTraverse): typeof babelTraverse {
	// @ts-ignore
	return fn.default ?? fn
}

function getLineNumber(node: Node) {
	// @ts-ignore
	return node.loc?.start?.line ?? node.body?.loc?.start?.line ?? node.callee?.loc?.start?.line ?? -1
}

export function extractParams(identifiers: Identifier[]) {
	const params = []
	for (let i = 0; i < identifiers.length; i++) {
		params.push(print(identifiers[i]).code)
	}

	return params.join(', ')
}

export function extractFunctionName(
	node: VariableDeclarator | FunctionDeclaration | ObjectProperty | FunctionExpression
) {
	if (node.type === 'ObjectProperty') {
		return (node.key as Identifier).name
	}
	if (node.id && node.id.type === 'Identifier') {
		return node.id.name
	}
	return 'anonymous'
}

export function extractFunctionCallName(node: CallExpression): string {
	if (node.callee.type === 'Identifier') {
		return node.callee.name
	}
	if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
		return node.callee.property.name
	}
	if (node.callee.type === 'CallExpression') {
		return extractFunctionCallName(node.callee)
	}
	return 'iife'
}

export function extractFunctionId(
	path: NodePath<FunctionDeclaration | FunctionExpression | ArrowFunctionExpression>,
	filePath: string,
	functionName: string,
	scopes: string[]
) {
	return `${filePath}-${path.scope.generateUid([...scopes, functionName].join('-'))}`
}

export function extractFunctionCallId(
	path: NodePath<CallExpression>,
	filePath: string,
	functionCallName: string,
	scopes: string[]
) {
	return `${filePath}-call-${path.scope.generateUid([...scopes, functionCallName].join('-'))}`
}

export function extractCurrentScope(
	path: NodePath<
		CallExpression | FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
	>
): string[] {
	const scopes: string[] = []

	let currentPath: NodePath<Node> = path

	while (currentPath.parentPath) {
		currentPath = currentPath.parentPath

		if (currentPath.node.type === 'BlockStatement') {
			scopes.push('{}')
		}
		if (
			['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
				currentPath.node.type
			)
		) {
			let scopeName: string
			if (currentPath.node.type === 'ArrowFunctionExpression') {
				scopeName = extractFunctionName(currentPath.parent as VariableDeclarator | ObjectProperty)
			} else if (currentPath.node.type === 'FunctionExpression') {
				if (currentPath.node.id?.type === 'Identifier') {
					scopeName = extractFunctionName(currentPath.node as FunctionExpression)
				} else {
					scopeName = extractFunctionName(currentPath.parent as VariableDeclarator)
				}
			} else {
				scopeName = extractFunctionName(currentPath.node as FunctionDeclaration)
			}
			scopes.push(scopeName)
		}
	}
	return scopes.reverse()
}

export function getWrappingFunctionId(
	path: NodePath<Node>,
	functionIdMap: Map<NodePath<Node>, string>
): string | undefined {
	let currentPath = path
	while (currentPath.parentPath) {
		currentPath = currentPath.parentPath
		if (functionIdMap.get(currentPath)) {
			return functionIdMap.get(currentPath)
		}
	}
}

export function extractArtifacts(code: string, filePath: string): Artifact[] {
	const artifacts: Artifact[] = []
	const ast = parse(code, { parser: babelTsParser })
	const functionIdMap = new Map<NodePath<Node>, string>()

	_babelInterop(babelTraverse)(ast, {
		ArrowFunctionExpression(path) {
			const functionName = extractFunctionName(path.parent as VariableDeclarator | ObjectProperty)
			const scopes = extractCurrentScope(path)
			const functionId = extractFunctionId(path, filePath, functionName, scopes)
			functionIdMap.set(path, functionId)

			artifacts.push({
				functionOrCallId: functionId,
				functionOrCallName: functionName,
				type: 'FUNCTION',
				params: extractParams(path.node.params as Identifier[]),
				scopes,
				source: {
					filePath,
					lineNumber: getLineNumber(path.node)
				}
			})
		},
		FunctionDeclaration(path) {
			const functionName = extractFunctionName(path.node)
			const scopes = extractCurrentScope(path)
			const functionId = extractFunctionId(path, filePath, functionName, scopes)
			functionIdMap.set(path, functionId)

			artifacts.push({
				functionOrCallId: functionId,
				functionOrCallName: functionName,
				type: 'FUNCTION',
				params: extractParams(path.node.params as Identifier[]),
				scopes,
				source: {
					filePath,
					lineNumber: getLineNumber(path.node)
				}
			})
		},
		FunctionExpression(path) {
			const functionName = extractFunctionName(path.parent as VariableDeclarator)
			const scopes = extractCurrentScope(path)
			const functionId = extractFunctionId(path, filePath, functionName, scopes)
			functionIdMap.set(path, functionId)

			artifacts.push({
				functionOrCallId: functionId,
				functionOrCallName: functionName,
				type: 'FUNCTION',
				params: extractParams(path.node.params as Identifier[]),
				scopes,
				source: {
					filePath,
					lineNumber: getLineNumber(path.node)
				}
			})
		},
		CallExpression(path) {
			const functionCallName = extractFunctionCallName(path.node, filePath)
			const scopes = extractCurrentScope(path)
			const functionCallId = extractFunctionCallId(path, filePath, functionCallName, scopes)
			const wrappedFunctionId = getWrappingFunctionId(path, functionIdMap)

			artifacts.push({
				functionOrCallId: functionCallId,
				functionOrCallName: functionCallName,
				type: 'CALL',
				params: extractParams(path.node.arguments as Identifier[]),
				scopes,
				source: {
					filePath,
					lineNumber: getLineNumber(path.node)
				},
				...(wrappedFunctionId && { functionId: wrappedFunctionId })
			})
		}
	})

	return artifacts
}
