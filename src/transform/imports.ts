import MagicString from 'magic-string'
import { findStaticImports } from 'mlly'
import { FLYTRAP_PACKAGE_NAME } from '../core/config'
import { loadConfig } from './config'
import * as flytrapExports from '../index'
import { parse } from '@babel/parser'

export function getCoreExports(): string[] {
	return Object.keys(flytrapExports)
}

export function findStartingIndex(s: MagicString) {
	const ast = parse(s.toString(), { sourceType: 'module', plugins: ['jsx', 'typescript'] })

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

export async function addFlytrapInit(s: MagicString) {
	const config = await loadConfig()
	if (!config) return s

	// Safeguard against slipping replaying config to prod or staging
	if (process?.env?.NODE_ENV !== 'development') {
		delete config['secretApiKey']
		delete config['privateKey']
		config['mode'] = 'capture'
	}

	// Append flytrap init
	s.appendLeft(findStartingIndex(s), `\n\nsetFlytrapConfig(${JSON.stringify(config)});\n\n`)

	return s
}
