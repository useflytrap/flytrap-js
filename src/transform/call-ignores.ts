import { NodePath } from '@babel/traverse'
import { CallExpression, Expression, V8IntrinsicIdentifier } from '@babel/types'
import generate from '@babel/generator'
import { _babelInterop } from './artifacts/artifacts'

const reservedWords = [
	'await',
	'break',
	'case',
	'catch',
	'class',
	'const',
	'continue',
	'debugger',
	'default',
	'delete',
	'do',
	'else',
	'export',
	'extends',
	'finally',
	'for',
	'function',
	'if',
	'import',
	'in',
	'instanceof',
	'new',
	'return',
	'super',
	'switch',
	'this',
	'throw',
	'try',
	'typeof',
	'var',
	'void',
	'while',
	'with',
	'yield',
	// Future Reserved Words
	'enum',
	// Strict Mode Reserved Words
	'implements',
	'interface',
	'let',
	'package',
	'private',
	'protected',
	'public',
	'static',
	// Reserved as Keywords as of ES6
	'null',
	'true',
	'false',
	// For now, all `require()` get ignored because of NodeJS
	'require'
]

function getFunctionPath(node: Expression | V8IntrinsicIdentifier): string {
	return _babelInterop(generate)(node).code
}

export function shouldIgnoreCall(path: NodePath<CallExpression>, ignoredImports: string[]) {
	const callPath = getFunctionPath(path.node.callee)
	const callPathNamespaces = callPath.split('.')

	if (
		ignoredImports.includes(callPathNamespaces[0]) ||
		reservedWords.includes(callPath) ||
		// special edge case for `super`
		callPathNamespaces[0] === 'super'
	)
		return true
	return false
}
