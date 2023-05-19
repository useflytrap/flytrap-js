import { findStaticImports, parseStaticImport } from 'mlly'
import { NodePath } from '@babel/traverse'
import { CallExpression, Expression, V8IntrinsicIdentifier } from '@babel/types'
import { print } from 'recast'

export function findIgnoredImports(code: string, packageIgnores: string[]) {
	const ignoredImports: string[] = []
	const statements = findStaticImports(code).filter((staticImport) => {
		return packageIgnores.some((packageName) => staticImport.specifier.includes(packageName))
	})
	for (let i = 0; i < statements.length; i++) {
		const imports = parseStaticImport(statements[i])
		if (imports.defaultImport) {
			ignoredImports.push(imports.defaultImport)
		}
		if (imports.namedImports) {
			for (const [, importedName] of Object.entries(imports.namedImports)) {
				ignoredImports.push(importedName)
			}
		}
	}
	return ignoredImports
}

function getFunctionPath(node: Expression | V8IntrinsicIdentifier): string {
	return print(node).code
}

export function shouldIgnoreCall(path: NodePath<CallExpression>, ignoredImports: string[]) {
	const callPath = getFunctionPath(path.node.callee)
	const callPathNamespaces = callPath.split('.')

	if (ignoredImports.includes(callPathNamespaces[0])) return true
	return false
}
