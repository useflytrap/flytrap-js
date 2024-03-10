import { findStaticImports, parseStaticImport } from 'mlly'

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
