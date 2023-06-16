import { dirname, join } from 'path'
import { homedir } from 'os'
import { deepEqual } from 'fast-equals'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { Artifact, CacheFile } from '../../exports'
import { cwd } from 'process'

export const getCacheFilePath = (projectId: string) => {
	if (process.env.NODE_ENV === 'test') {
		return join(cwd(), '.flytrap', 'cache', `${projectId}.json`)
	}
	return join(homedir(), '.flytrap', 'cache', `${projectId}.json`)
}

function _createCacheFile(projectId: string): string {
	const cacheFilePath = getCacheFilePath(projectId)
	const cacheDirPath = dirname(cacheFilePath)
	mkdirSync(cacheDirPath, { recursive: true })
	if (!existsSync(cacheFilePath)) {
		const cache: CacheFile = {
			projectId,
			createdTimestamp: Date.now(),
			artifactCacheEntries: []
		}
		writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2))
	}
	return cacheFilePath
}

function _saveCacheFile(projectId: string, cache: CacheFile) {
	const cacheFilePath = _createCacheFile(projectId)
	writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2))
}

const _getCacheFile = (projectId: string): CacheFile => {
	const cacheFilePath = _createCacheFile(projectId)
	const cacheFileContents = readFileSync(cacheFilePath).toString()
	return JSON.parse(cacheFileContents) as CacheFile
}

const _indexOfArtifactWithId = (haystack: Artifact[], functionOrCallId: string) =>
	haystack.findIndex((h) => h.functionOrCallId === functionOrCallId)

export function upsertArtifact(projectId: string, artifact: Artifact) {
	const cache = _getCacheFile(projectId)
	const savedArtifacts = cache.artifactCacheEntries.reduce(
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
		cache.artifactCacheEntries[artifactIndex] = {
			...cache.artifactCacheEntries[artifactIndex],
			uploadStatus: 'not-uploaded',
			artifact
		}
		return
	}

	cache.artifactCacheEntries.push({
		timestamp: Date.now(),
		uploadStatus: 'not-uploaded',
		artifact
	})

	// Save cache
	_saveCacheFile(projectId, cache)
}

export function markArtifactAsUploaded(projectId: string, artifact: Artifact) {
	const cache = _getCacheFile(projectId)
	const savedArtifacts = cache.artifactCacheEntries.reduce(
		(acc, curr) => [...acc, curr.artifact],
		[] as Artifact[]
	)
	const artifactIndex = _indexOfArtifactWithId(savedArtifacts, artifact.functionOrCallId)
	if (artifactIndex !== -1) {
		cache.artifactCacheEntries[artifactIndex].uploadStatus = 'uploaded'
	}

	// Save cache
	_saveCacheFile(projectId, cache)
}

export function getArtifactsToUpload(projectId: string) {
	const cache = _getCacheFile(projectId)

	return cache.artifactCacheEntries
		.filter((a) => a.uploadStatus !== 'uploaded')
		.reduce((acc, curr) => [...acc, curr.artifact], [] as Artifact[])
}
