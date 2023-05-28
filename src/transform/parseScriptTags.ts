export type ScriptTagMeta = {
	start: number
	end: number
	content: string
}

export function parseScriptTags(code: string): ScriptTagMeta[] {
	const scriptTagRegexp = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gm
	const scriptTags: ScriptTagMeta[] = []
	let match: RegExpExecArray | null = null

	while ((match = scriptTagRegexp.exec(code))) {
		const content = match[1]
		const startIndex = match.index + match[0].indexOf(content)
		scriptTags.push({
			start: startIndex,
			end: startIndex + content.length,
			content
		})
	}

	return scriptTags
}

export function containsScriptTags(code: string) {
	const scriptTags = parseScriptTags(code)
	return scriptTags.length > 0
}
