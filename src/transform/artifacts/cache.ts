import { dirname, join } from 'path'
import { homedir } from 'os'
import { deepEqual } from 'fast-equals'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { Artifact, CacheFile, DatabaseArtifact } from '../../exports'
import { cwd } from 'process'
import { formatBytes, get } from '../../core/util'
import { FLYTRAP_API_BASE } from '../../core/config'
import { log } from '../../core/logging'
import { batchedArtifactsUpload } from './batchedArtifactsUpload'

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
		log.info('cache', `Creating cache file at path ${cacheFilePath}.`)
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

const _populateCache = async (projectId: string, secretApiKey: string): Promise<CacheFile> => {
	const artifacts = await _fetchUploadedArtifacts(projectId, secretApiKey)
	const cache = _getCacheFile(projectId)
	for (let i = 0; i < artifacts.length; i++) {
		cache.artifactCacheEntries.push({
			artifact: artifacts[i],
			timestamp: Date.now(),
			uploadStatus: 'uploaded'
		})
	}
	_saveCacheFile(projectId, cache)
	return cache
}

function _removeDatabaseKeys(artifact: DatabaseArtifact): Artifact {
	const { id: _id, createdAt: _createdAt, projectId: _projectId, ...rest } = artifact
	if (rest.functionId === null) delete rest.functionId
	return rest
}

export async function _getArtifactsToUpload(
	projectId: string,
	secretApiKey: string,
	artifacts: Artifact[]
) {
	const alreadyUploadedArtifacts = await _fetchUploadedArtifacts(projectId, secretApiKey)
	const artifactsToUpload: Artifact[] = []
	for (let i = 0; i < artifacts.length; i++) {
		const existingArtifactIndex = _indexOfArtifactWithId(
			alreadyUploadedArtifacts,
			artifacts[i].functionOrCallId
		)
		if (existingArtifactIndex !== -1) {
			const withoutDatabaseKeys = _removeDatabaseKeys(
				alreadyUploadedArtifacts[existingArtifactIndex]
			)
			// Exists, check if they're the same
			if (!deepEqual(withoutDatabaseKeys, artifacts[i])) {
				artifactsToUpload.push(artifacts[i])
				continue
			}
		} else {
			// Doesn't exist in uploaded artifacts
			artifactsToUpload.push(artifacts[i])
		}
	}
	return artifactsToUpload
}

export async function upsertArtifacts(
	projectId: string,
	secretApiKey: string,
	artifacts: Artifact[]
) {
	const artifactsToUpload = await _getArtifactsToUpload(projectId, secretApiKey, artifacts)
	// Upload artifacts
	const uploadedBatches = await batchedArtifactsUpload(artifactsToUpload, secretApiKey, projectId)
	log.info(
		'storage',
		`Pushed ${artifactsToUpload.length} artifacts in ${
			uploadedBatches?.length
		} batches to the Flytrap API. Payload Size: ${formatBytes(
			JSON.stringify(artifactsToUpload).length
		)}`
	)
	return uploadedBatches
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

export async function _fetchUploadedArtifacts(projectId: string, secretApiKey: string) {
	const { data, error } = await get<DatabaseArtifact[]>(
		`${FLYTRAP_API_BASE}/api/v1/artifacts/${projectId}`,
		undefined,
		{
			headers: new Headers({
				Authorization: `Bearer ${secretApiKey}`,
				'Content-Type': 'application/json'
			})
		}
	)
	if (error || data === null) {
		throw error
	}

	return data
}
