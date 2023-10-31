import { NodePath } from '@babel/traverse'
import { CallExpression, Expression, V8IntrinsicIdentifier } from '@babel/types'
import { resolve } from 'path'
// import { print } from 'recast'
import generate from '@babel/generator'

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
	// return print(node).code
	return generate(node).code
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
