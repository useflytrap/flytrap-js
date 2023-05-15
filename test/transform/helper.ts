// Some code to download source code to transform
import { join } from 'path'
import degit from 'degit'
import { rmSync } from 'fs'

export const targetPath = join(__dirname, 'repos')

async function degitRepo(repoName: string) {
	const [, name] = repoName.split('/')
	const emitter = degit(repoName, { force: true })
	await emitter.clone(join(targetPath, name))
}

export function cleanupTargets() {
	rmSync(targetPath, { recursive: true })
}

export type Target = {
	repo: string
	sourcePath: string
}

export async function generateFixtures(targets: Record<string, Target>) {
	for (const [, target] of Object.entries(targets)) {
		await degitRepo(target.repo)
	}
}
