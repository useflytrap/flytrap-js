import { NodePath } from '@babel/traverse'
import { CallExpression, Expression, V8IntrinsicIdentifier } from '@babel/types'
import { resolve } from 'path'
import generate from '@babel/generator'
import { _babelInterop } from './util'

/**
 * Exclude directories
 */
export function excludeDirectoriesIncludeFilePath(filePath: string, excludeDirectories: string[]) {
	return excludeDirectories.some((excludedDir) => {
		if (resolve(filePath).includes(resolve(excludedDir))) {
			return true
		}
		return false
	})
}

function getFunctionPath(node: Expression | V8IntrinsicIdentifier): string {
	return _babelInterop(generate)(node).code
}

export function shouldIgnoreFunctionName(
	path: NodePath<CallExpression>,
	ignoredFunctionNames: string[]
) {
	const callPath = getFunctionPath(path.node.callee)
	if (ignoredFunctionNames.includes(callPath)) {
		return true
	}

	return false
}
