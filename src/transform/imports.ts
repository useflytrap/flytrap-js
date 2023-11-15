import MagicString from 'magic-string'
import { findStaticImports, parseStaticImport } from 'mlly'
import { FLYTRAP_PACKAGE_NAME } from '../core/config'
import { FlytrapConfig } from '../core/types'
import * as flytrapExports from '../index'
import { parseCode } from './parser'
import { extname } from '../core/util'

export function getRequiredExportsForCapture(): string[] {
	// return ['useFlytrapCall', 'useFlytrapCallAsync', 'useFlytrapFunction', 'setFlytrapConfig', 'uff']
	return ['uff']
}

export function getCoreExports(): string[] {
	return Object.keys(flytrapExports)
}

export function findStartingIndex(s: MagicString, fileNamePath?: string) {
	const { error, data: ast } = parseCode(s.toString(), fileNamePath)

	if (error !== null) {
		console.error(error.toString())
		throw new Error(error.toString())
	}

	if (ast.program.interpreter && ast.program.interpreter.end) {
		return ast.program.interpreter.end
	}

	if (ast.program.directives && ast.program.directives[0]?.type === 'Directive') {
		return ast.program.directives[0].end ?? 0
	}

	return 0
}

export function addMissingFlytrapImports(
	s: MagicString,
	fileNamePath: string,
	config?: Partial<FlytrapConfig>
) {
	const statements = findStaticImports(s.toString()).filter(
		(i) => i.specifier === FLYTRAP_PACKAGE_NAME || i.specifier === FLYTRAP_PACKAGE_NAME + '/browser'
	)
	const parsedImports = statements.map((importStatement) => parseStaticImport(importStatement))
	const importedFunctions = parsedImports.reduce(
		(acc, curr) => [...acc, ...Object.keys(curr.namedImports ?? {})],
		[] as string[]
	)
	const importsToBeAdded = getRequiredExportsForCapture().filter(
		(i) => !importedFunctions.includes(i)
	)

	if (importsToBeAdded.length > 0) {
		const startingIndex = findStartingIndex(s, fileNamePath)

		let useCommonjsImportSyntax = config?.transformOptions?.importFormat === 'commonjs'
		if (extname(fileNamePath) === '.cjs') {
			useCommonjsImportSyntax = true
		}
		if (extname(fileNamePath) === '.mjs') {
			useCommonjsImportSyntax = false
		}
		if (useCommonjsImportSyntax) {
			s.appendLeft(
				startingIndex,
				`\n\nconst { ${importsToBeAdded.join(', ')} } = require('${FLYTRAP_PACKAGE_NAME}${
					config?.browser === true ? '/browser' : ''
				}');\n\n`
			)
		} else {
			s.appendLeft(
				startingIndex,
				`\n\nimport { ${importsToBeAdded.join(', ')} } from '${FLYTRAP_PACKAGE_NAME}${
					config?.browser === true ? '/browser' : ''
				}';\n\n`
			)
		}
	}

	return s
}

export async function addFlytrapInit(
	s: MagicString,
	fileNamePath: string,
	config: FlytrapConfig | undefined
) {
	if (!config) return s

	const copiedConfig = { ...config }

	// Safeguard against slipping replaying config to prod or staging
	if (process?.env?.NODE_ENV !== 'development') {
		delete copiedConfig['secretApiKey']
		delete copiedConfig['privateKey']
		copiedConfig['mode'] = 'capture'
	}

	// Append flytrap init
	s.appendLeft(
		findStartingIndex(s, fileNamePath),
		`\n\nsetFlytrapConfig(${JSON.stringify(copiedConfig)});\n\n`
	)

	return s
}
