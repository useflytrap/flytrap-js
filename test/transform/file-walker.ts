import { opendir } from 'fs/promises'
import { join } from 'path'

export async function* walk(
	dir: string,
	ignorePaths: string[] = ['/node_modules/']
): AsyncGenerator<string> {
	for await (const d of await opendir(dir)) {
		const entry = join(dir, d.name)
		if (ignorePaths.some((ignoredPath) => entry.includes(ignoredPath))) {
			continue
		}
		if (d.isDirectory()) yield* walk(entry)
		else if (d.isFile()) yield entry
	}
}
