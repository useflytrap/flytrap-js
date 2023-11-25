import babelTraverse, { Node, NodePath } from '@babel/traverse'
import generate from '@babel/generator'
import {
	ArrowFunctionExpression,
	CallExpression,
	FunctionDeclaration,
	FunctionExpression,
	Identifier,
	ObjectProperty,
	Pattern,
	RestElement,
	VariableDeclarator
} from '@babel/types'
import { ArtifactMarking, FlytrapConfig } from '../../core/types'
import { getRequiredExportsForCapture } from '../imports'
import { getParseConfig } from '../config'
import { _babelInterop } from '../util'
import { parseCode } from '../parser'
import { Ok } from 'ts-results'

function getLineNumber(node: Node) {
	// @ts-ignore
	return node.loc?.start?.line ?? node.body?.loc?.start?.line ?? node.callee?.loc?.start?.line ?? -1
}

export function extractParams(identifiers: Identifier[]) {
	const params: string[] = []
	for (let i = 0; i < identifiers.length; i++) {
		params.push(_babelInterop(generate)(identifiers[i]).code)
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

export function extractFullFunctionCallName(node: CallExpression): string {
	const fullNamespacedFunctionCall = _babelInterop(generate)(node).code
	const lastIndexOfOpeningParen = fullNamespacedFunctionCall.lastIndexOf('(')
	return fullNamespacedFunctionCall.slice(0, lastIndexOfOpeningParen)
}

export function extractFunctionCallName(node: CallExpression): string | 'iife' {
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
	>,
	includeCallExpressions = false
): string[] {
	const scopes: string[] = []
	let currentPath: NodePath<Node> = path

	while (currentPath.parentPath) {
		currentPath = currentPath.parentPath

		if (includeCallExpressions && currentPath.node.type === 'CallExpression') {
			const functionCallName = extractFunctionCallName(currentPath.node)
			if (
				functionCallName !== 'iife' &&
				!getRequiredExportsForCapture().includes(functionCallName)
			) {
				scopes.push(functionCallName)
			}
		}

		if (
			['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
				currentPath.node.type
			)
		) {
			let scopeName: string
			if (currentPath.node.type === 'FunctionExpression') {
				if (currentPath.node.id?.type === 'Identifier') {
					scopeName = extractFunctionName(currentPath.node as FunctionExpression)
				} else {
					scopeName = extractFunctionName(currentPath.parent as VariableDeclarator)
				}
			} else if (
				currentPath.node.type === 'ArrowFunctionExpression' &&
				currentPath.parent.type === 'VariableDeclarator'
			) {
				scopeName = extractFunctionName(currentPath.parent)
			} else {
				scopeName = extractFunctionName(currentPath.node as FunctionDeclaration)
			}
			scopes.push(scopeName)
		}
	}
	return scopes.reverse()
}

export function addArtifactMarkings(code: string, filePath: string, config?: FlytrapConfig) {
	code = code.replaceAll('\t', '    ')
	const functionOrCallIdsAndLocations: ArtifactMarking[] = []
	const parseCodeResult = parseCode(code, filePath, getParseConfig(config?.babel?.parserOptions))

	if (parseCodeResult.err) {
		return parseCodeResult
	}

	const extractParamsLocation = (params: (Identifier | RestElement | Pattern)[]) => {
		if (params.length === 0) {
			return undefined
		}
		if (!params[0].start || !params[0].end) {
			// @todo: improved error
			throw new Error('invalid params start or end')
		}
		const startIndex = params[0].start - 1
		let endIndex = params[0].end + 1
		for (let i = 0; i < params.length; i++) {
			endIndex = (params[i].end as number) + 1
		}

		return [startIndex, endIndex]
	}

	_babelInterop(babelTraverse)(parseCodeResult.val, {
		ArrowFunctionExpression(path) {
			const functionName = extractFunctionName(path.parent as VariableDeclarator | ObjectProperty)
			const scopes = extractCurrentScope(path)
			const functionId = extractFunctionId(path, filePath, functionName, scopes)

			const paramsLocation = extractParamsLocation(path.node.params)
			const firstIndexOfOpenParen = _babelInterop(generate)(path.node).code.indexOf('(')

			if (paramsLocation || firstIndexOfOpenParen !== -1) {
				functionOrCallIdsAndLocations.push({
					type: 'params',
					functionOrCallId: functionId,
					startIndex: paramsLocation?.[0] ?? path.node.start! + firstIndexOfOpenParen,
					endIndex: paramsLocation?.[1] ?? path.node.start! + firstIndexOfOpenParen + 2
				})
			}
		},
		FunctionDeclaration(path) {
			const functionName = extractFunctionName(path.node)
			const scopes = extractCurrentScope(path)
			const functionId = extractFunctionId(path, filePath, functionName, scopes)

			const paramsLocation = extractParamsLocation(path.node.params)
			const firstIndexOfOpenParen = _babelInterop(generate)(path.node).code.indexOf('(')

			functionOrCallIdsAndLocations.push({
				type: 'function',
				functionOrCallId: functionId,
				startIndex: path.node.start!,
				// @ts-expect-error
				endIndex: path.node.id.end
			})
			if (paramsLocation || firstIndexOfOpenParen !== -1) {
				functionOrCallIdsAndLocations.push({
					type: 'params',
					functionOrCallId: functionId,
					startIndex: paramsLocation?.[0] ?? path.node.start! + firstIndexOfOpenParen,
					endIndex: paramsLocation?.[1] ?? path.node.start! + firstIndexOfOpenParen + 2
				})
			}
		},
		FunctionExpression(path) {
			const functionName =
				path.node.id?.name ?? extractFunctionName(path.parent as VariableDeclarator)
			const scopes = extractCurrentScope(path)
			const functionId = extractFunctionId(path, filePath, functionName, scopes)

			const paramsLocation = extractParamsLocation(path.node.params)
			const firstIndexOfOpenParen = _babelInterop(generate)(path.node).code.indexOf('(')

			functionOrCallIdsAndLocations.push({
				type: 'function',
				functionOrCallId: functionId,
				startIndex: path.node.start!,
				endIndex: path.node.start! + firstIndexOfOpenParen
			})
			if (paramsLocation || firstIndexOfOpenParen !== -1) {
				functionOrCallIdsAndLocations.push({
					type: 'params',
					functionOrCallId: functionId,
					startIndex: paramsLocation?.[0] ?? path.node.start! + firstIndexOfOpenParen,
					endIndex: paramsLocation?.[1] ?? path.node.start! + firstIndexOfOpenParen + 2
				})
			}
		},
		CallExpression(path) {
			const functionCallName = extractFunctionCallName(path.node)
			const scopes = extractCurrentScope(path)
			const functionCallId = extractFunctionCallId(path, filePath, functionCallName, scopes)

			const paramsLocation = extractParamsLocation(path.node.arguments as Identifier[])
			const firstIndexOfOpenParen = _babelInterop(generate)(path.node).code.indexOf('(')

			functionOrCallIdsAndLocations.push({
				type: 'call',
				startIndex: path.node.start!,
				endIndex: path.node.start! + firstIndexOfOpenParen,
				functionOrCallId: functionCallId
			})

			if (paramsLocation || firstIndexOfOpenParen !== -1) {
				functionOrCallIdsAndLocations.push({
					type: 'arguments',
					functionOrCallId: functionCallId,
					startIndex: paramsLocation?.[0] ?? path.node.start! + firstIndexOfOpenParen,
					endIndex: paramsLocation?.[1] ?? path.node.start! + firstIndexOfOpenParen + 2
				})
			}
		}
	})

	return Ok(functionOrCallIdsAndLocations)
}
