import babelTraverse, { Node, NodePath } from '@babel/traverse'
// import { parse, print } from 'recast'
// import babelTsParser from 'recast/parsers/babel-ts.js'
import { parse } from '@babel/parser'
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
import { ArtifactMarking } from '../../core/types'
import { getRequiredExportsForCapture } from '../imports'

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
	const params: string[] = []
	for (let i = 0; i < identifiers.length; i++) {
		// params.push(print(identifiers[i]).code)
		params.push(generate(identifiers[i]).code)
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
	// const fullNamespacedFunctionCall = print(node).code
	const fullNamespacedFunctionCall = generate(node).code
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

export function addArtifactMarkings(code: string, filePath: string) {
	code = code.replaceAll('\t', '    ')
	const functionOrCallIdsAndLocations: ArtifactMarking[] = []
	// const ast = parse(code, { parser: babelTsParser })
	const ast = parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] })

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

	_babelInterop(babelTraverse)(ast, {
		ArrowFunctionExpression(path) {
			const functionName = extractFunctionName(path.parent as VariableDeclarator | ObjectProperty)
			const scopes = extractCurrentScope(path)
			const functionId = extractFunctionId(path, filePath, functionName, scopes)

			const paramsLocation = extractParamsLocation(path.node.params)
			// const firstIndexOfOpenParen = print(path.node).code.indexOf('(')
			const firstIndexOfOpenParen = generate(path.node).code.indexOf('(')

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
			// const firstIndexOfOpenParen = print(path.node).code.indexOf('(')
			const firstIndexOfOpenParen = generate(path.node).code.indexOf('(')


			if (code === 'function foo  ()   {}') {
				console.log("PARAMS LOCATION ")
				console.log(paramsLocation)
				console.log(path.node.params)
			}

			functionOrCallIdsAndLocations.push({
				type: 'function',
				functionOrCallId: functionId,
				startIndex: path.node.start!,
				// @ts-expect-error
				endIndex: path.node.id.end
			})
			if (paramsLocation || firstIndexOfOpenParen !== -1) {
				if (code === 'function foo  ()   {}') {
					console.log("here getting params location")
					console.log(paramsLocation)
					console.log("first index", firstIndexOfOpenParen)
					console.log("Generated code")
					console.log(generate(path.node).code)

				}
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
			// const firstIndexOfOpenParen = print(path.node).code.indexOf('(')
			const firstIndexOfOpenParen = generate(path.node).code.indexOf('(')

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
			// const firstIndexOfOpenParen = print(path.node).code.indexOf('(')
			const firstIndexOfOpenParen = generate(path.node).code.indexOf('(')

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

	return functionOrCallIdsAndLocations
}
