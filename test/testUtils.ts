export const addAsync = (isAsync: boolean) => (isAsync ? 'async ' : '')
export const addAwait = (isAsync: boolean) => (isAsync ? 'await ' : '')

export function toOneLine(code: string) {
	return code.split('\n').join('').replace(/\s+/g, '').replaceAll("'", '"').replaceAll(';', '')
}
