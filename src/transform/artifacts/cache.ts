import { dirname, join } from 'path'
import { homedir } from 'os'
import { deepEqual } from 'fast-equals'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { Artifact, CacheFile } from '../../exports'

function _createCacheFile(projectId: string): string {
	const cacheFilePath = join(homedir(), '.flytrap', 'cache', `${projectId}.json`)
	const cacheDirPath = dirname(cacheFilePath)
	mkdirSync(cacheDirPath, { recursive: true })
	if (!existsSync(cacheFilePath)) {
		const cache: CacheFile = {
			projectId,
			createdTimestamp: Date.now(),
			artifacts: []
		}
		writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2))
	}
	return cacheFilePath
}

function _saveCacheFile(projectId: string, cache: CacheFile) {
	_createCacheFile(projectId)
	const cacheFilePath = join(homedir(), '.flytrap', 'cache', `${projectId}.json`)
	writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2))
}

const _getCacheFile = (projectId: string): CacheFile => {
	_createCacheFile(projectId)
	const cacheFilePath = join(homedir(), '.flytrap', 'cache', `${projectId}.json`)
	const cacheFileContents = readFileSync(cacheFilePath).toString()
	return JSON.parse(cacheFileContents) as CacheFile
}

const _indexOfArtifactWithId = (haystack: Artifact[], functionOrCallId: string) =>
	haystack.findIndex((h) => h.functionOrCallId === functionOrCallId)

export function upsertArtifact(projectId: string, artifact: Artifact) {
	const cache = _getCacheFile(projectId)
	const savedArtifacts = cache.artifacts.reduce(
		(acc, curr) => [...acc, curr.artifact],
		[] as Artifact[]
	)
	const artifactIndex = _indexOfArtifactWithId(savedArtifacts, artifact.functionOrCallId)

	if (artifactIndex !== -1) {
		// check if upserted artifact has changed, if has, mark artifact as not pushed
		const existingArtifact = savedArtifacts.at(artifactIndex)
		if (deepEqual(existingArtifact, artifact)) {
			return
		}
		// Update
		cache.artifacts[artifactIndex] = {
			...cache.artifacts[artifactIndex],
			uploadStatus: 'not-uploaded',
			artifact
		}
		return
	}

	cache.artifacts.push({
		timestamp: Date.now(),
		uploadStatus: 'not-uploaded',
		artifact
	})

	// Save cache
	_saveCacheFile(projectId, cache)
}

export function markArtifactAsUploaded(projectId: string, artifact: Artifact) {
	const cache = _getCacheFile(projectId)
	const savedArtifacts = cache.artifacts.reduce(
		(acc, curr) => [...acc, curr.artifact],
		[] as Artifact[]
	)
	const artifactIndex = _indexOfArtifactWithId(savedArtifacts, artifact.functionOrCallId)
	cache.artifacts[artifactIndex].uploadStatus = 'uploaded'

	// Save cache
	_saveCacheFile(projectId, cache)
}

export function getArtifactsToUpload(projectId: string) {
	const cache = _getCacheFile(projectId)

	return cache.artifacts
		.filter((a) => a.uploadStatus !== 'uploaded')
		.reduce((acc, curr) => [...acc, curr.artifact], [] as Artifact[])
}
