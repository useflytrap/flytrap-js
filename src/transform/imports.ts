import MagicString from 'magic-string'
import { findStaticImports } from 'mlly'
import { FLYTRAP_PACKAGE_NAME } from '../core/config'
import { parse } from '@babel/parser'
import { FlytrapConfig } from '../core/types'

export function getCoreExports(): string[] {
	return [
		'useFlytrapCall',
		'useFlytrapCallAsync',
		'useFlytrapFunction',
		'setFlytrapConfig',
		'capture',
		'identify'
	]
}

export function findStartingIndex(s: MagicString) {
	const ast = parse(s.toString(), { sourceType: 'module', plugins: ['jsx', 'typescript'] })

	if (ast.program.interpreter && ast.program.interpreter.end) {
		return ast.program.interpreter.end
	}

	if (ast.program.directives && ast.program.directives[0]?.type === 'Directive') {
		return ast.program.directives[0].end ?? 0
	}

	return 0
}

export function addMissingFlytrapImports(s: MagicString) {
	const statements = findStaticImports(s.toString()).filter(
		(i) => i.specifier === FLYTRAP_PACKAGE_NAME
	)

	// Remove existing Flytrap import statements
	for (let i = 0; i < statements.length; i++) {
		s.remove(statements[i].start, statements[i].end)
	}

	const startingIndex = findStartingIndex(s)

	s.appendLeft(
		startingIndex,
		`\n\nimport { ${getCoreExports().join(', ')} } from '${FLYTRAP_PACKAGE_NAME}'\n\n`
	)
	return s
}

export async function addFlytrapInit(s: MagicString, config: FlytrapConfig | undefined) {
	if (!config) return s

	const copiedConfig = { ...config }

	// Safeguard against slipping replaying config to prod or staging
	if (process?.env?.NODE_ENV !== 'development') {
		delete copiedConfig['secretApiKey']
		delete copiedConfig['privateKey']
		copiedConfig['mode'] = 'capture'
	}

	// Append flytrap init
	s.appendLeft(findStartingIndex(s), `\n\nsetFlytrapConfig(${JSON.stringify(copiedConfig)});\n\n`)

	return s
}
