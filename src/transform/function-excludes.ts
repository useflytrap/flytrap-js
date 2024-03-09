import { NodePath } from '@babel/traverse'
import { CallExpression, Expression, V8IntrinsicIdentifier } from '@babel/types'
import { _babelInterop } from './artifacts/artifacts'
import generate from '@babel/generator'

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
