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
	ObjectProperty,
	VariableDeclarator,
	MemberExpression,
	isMemberExpression,
	isNumericLiteral,
	isStringLiteral,
	Identifier,
	ImportDeclaration,
	exportDefaultDeclaration,
	exportNamedDeclaration,
	CallExpression,
	VariableDeclaration,
	ExportDefaultDeclaration,
	ExportNamedDeclaration,
	RestElement,
	Pattern
} from '@babel/types'
import generate from '@babel/generator'
import {
	_babelInterop,
	extractCurrentScope,
	extractFunctionCallId,
	extractFunctionId,
	extractFunctionName
} from './artifacts/artifacts'
import { ArtifactMarking, FlytrapConfig } from '../core/types'
import { parseCode } from './parser'
import { createHumanLog } from '../core/errors'
import { log } from '../core/logging'
import { Err, Ok } from 'ts-results'
import { shouldIgnoreFunctionName } from './function-excludes'
import { shouldIgnoreCall } from './call-ignores'
import * as flytrapExports from '../index'

function getRequiredExportsForCapture(): string[] {
	return ['uff', 'ufc', 'setFlytrapConfig']
}

function getCoreExports(): string[] {
	return Object.keys(flytrapExports)
}

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
 * Transforms code using the new more minimal `uff` wrapper & gathers artifact markings
 * at the same time.
 *
 * @param code
 * @param filePath
 * @param config
 * @returns The generated code and sourcemap
 */
export function flytrapTransformWithArtifacts(
	code: string,
	filePath: string,
	config?: Partial<FlytrapConfig>,
	findIgnoredImports?: (code: string, packageIgnores: string[]) => string[],
	returnArtifacts = false
) {
	const parseResult = parseCode(code, filePath, config?.babel?.parserOptions)

	if (parseResult.err) {
		log.error('error', parseResult.val.toString())
		return parseResult
	}

	const ast = parseResult.val

	const artifactMarkings: ArtifactMarking[] = []

	const extractParamsLocation = (params: (Identifier | RestElement | Pattern)[]) => {
		if (params.length === 0) {
			return Ok(undefined)
		}
		if (!params[0].start || !params[0].end) {
			return Err(`Extracting params location failed: Invalid params start or end.`)
		}
		const startIndex = params[0].start - 1
		let endIndex = params[0].end + 1
		for (let i = 0; i < params.length; i++) {
			endIndex = (params[i].end as number) + 1
		}

		return Ok([startIndex, endIndex])
	}

	const ignoredImports =
		config?.packageIgnores && findIgnoredImports
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

					if (returnArtifacts) {
						const paramsLocation = extractParamsLocation(path.node.params)
						if (paramsLocation.err === false) {
							const firstIndexOfOpenParen = _babelInterop(generate)(path.node).code.indexOf('(')

							if (paramsLocation || firstIndexOfOpenParen !== -1) {
								artifactMarkings.push({
									type: 'params',
									functionOrCallId: functionId,
									startIndex: paramsLocation.val?.[0] ?? path.node.start! + firstIndexOfOpenParen,
									endIndex: paramsLocation.val?.[1] ?? path.node.start! + firstIndexOfOpenParen + 2
								})
							}
						} else {
							log.warn('transform', paramsLocation.val)
						}
					}

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

					if (returnArtifacts) {
						const paramsLocation = extractParamsLocation(path.node.params)
						if (paramsLocation.err === false) {
							const firstIndexOfOpenParen = _babelInterop(generate)(path.node).code.indexOf('(')

							artifactMarkings.push({
								type: 'function',
								functionOrCallId: functionId,
								startIndex: path.node.start!,
								// @ts-expect-error
								endIndex: path.node.id.end
							})
							if (paramsLocation || firstIndexOfOpenParen !== -1) {
								artifactMarkings.push({
									type: 'params',
									functionOrCallId: functionId,
									startIndex: paramsLocation.val?.[0] ?? path.node.start! + firstIndexOfOpenParen,
									endIndex: paramsLocation.val?.[1] ?? path.node.start! + firstIndexOfOpenParen + 2
								})
							}
						} else {
							log.warn('transform', paramsLocation.val)
						}
					}

					const useFlytrapCallExpressionNode = callExpression(identifier('uff'), [
						toExpression(path.node),
						stringLiteral(functionId)
						// objectExpression([objectProperty(identifier('id'), stringLiteral(functionId))])
					])

					let transformedNode:
						| CallExpression
						| VariableDeclaration
						| ExportNamedDeclaration
						| ExportDefaultDeclaration
						| undefined = undefined

					// Handle default / named export(s)
					if (path.parent.type === 'ExportDefaultDeclaration') {
						transformedNode = exportDefaultDeclaration(useFlytrapCallExpressionNode)
					} else if (path.parent.type === 'ExportNamedDeclaration') {
						transformedNode = exportNamedDeclaration(
							variableDeclaration('const', [
								variableDeclarator(
									// @ts-ignore
									identifier(path.node.id.name),
									useFlytrapCallExpressionNode
								)
							])
						)
					} else {
						transformedNode = variableDeclaration('const', [
							variableDeclarator(
								// @ts-ignore
								identifier(path.node.id.name),
								useFlytrapCallExpressionNode
							)
						])
					}

					// Handle function declaration hoisting
					if (config?.disableFunctionDeclarationHoisting) {
						path.replaceWith(transformedNode)
						return
					}

					const scopePath = path.findParent((parentPath) => {
						return parentPath.isBlockStatement() || parentPath.isProgram()
					})

					if (scopePath) {
						let lastImportPath: NodePath<ImportDeclaration> | undefined = undefined
						const bodyNode = scopePath.get('body')
						if (Array.isArray(bodyNode)) {
							bodyNode.forEach((bodyPath) => {
								if (bodyPath.isImportDeclaration()) {
									lastImportPath = bodyPath
								}
							})
						} else if (bodyNode.isImportDeclaration()) {
							lastImportPath = bodyNode
						}

						if (lastImportPath) {
							// Insert after the last import statement
							lastImportPath.insertAfter(transformedNode)
						} else {
							// @ts-expect-error: Otherwise, insert at the top of the current scope
							scopePath.unshiftContainer('body', transformedNode)
						}

						// Remove the original function declaration
						path.remove()
						return
					} else {
						const humanLog = createHumanLog({
							events: ['transform_hoisting_failed'],
							explanations: ['transform_parent_scope_not_found'],
							solutions: ['open_issue', 'join_discord'],
							params: {
								fileNamePath: filePath,
								functionName
							}
						})

						log.warn('transform', humanLog.toString())
					}
					// No hoisting if there is no parent scope
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

						if (returnArtifacts) {
							const paramsLocation = extractParamsLocation(path.node.params)

							if (paramsLocation.err === false) {
								const firstIndexOfOpenParen = _babelInterop(generate)(path.node).code.indexOf('(')

								artifactMarkings.push({
									type: 'function',
									functionOrCallId: functionId,
									startIndex: path.node.start!,
									endIndex: path.node.start! + firstIndexOfOpenParen
								})
								if (paramsLocation || firstIndexOfOpenParen !== -1) {
									artifactMarkings.push({
										type: 'params',
										functionOrCallId: functionId,
										startIndex: paramsLocation.val?.[0] ?? path.node.start! + firstIndexOfOpenParen,
										endIndex:
											paramsLocation.val?.[1] ?? path.node.start! + firstIndexOfOpenParen + 2
									})
								}
							} else {
								log.warn('transform', paramsLocation.val)
							}
						}

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

					if (returnArtifacts) {
						const paramsLocation = extractParamsLocation(path.node.arguments as Identifier[])

						if (paramsLocation.err === false) {
							const firstIndexOfOpenParen = _babelInterop(generate)(path.node).code.indexOf('(')
							artifactMarkings.push({
								type: 'call',
								startIndex: path.node.start!,
								endIndex: path.node.start! + firstIndexOfOpenParen,
								functionOrCallId: functionCallId
							})
							if (paramsLocation || firstIndexOfOpenParen !== -1) {
								artifactMarkings.push({
									type: 'arguments',
									functionOrCallId: functionCallId,
									startIndex: paramsLocation.val?.[0] ?? path.node.start! + firstIndexOfOpenParen,
									endIndex: paramsLocation.val?.[1] ?? path.node.start! + firstIndexOfOpenParen + 2
								})
							}
						} else {
							log.warn('transform', paramsLocation.val)
						}
					}

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

		return Err(errorLog)
	}

	return Ok({ ..._babelInterop(generate)(ast), artifactMarkings })
}
