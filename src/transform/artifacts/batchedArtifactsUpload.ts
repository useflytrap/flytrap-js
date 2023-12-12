import { Result } from 'ts-results'
import { getApiBase } from '../../core/config'
import { Artifact } from '../../core/types'
import { request } from '../../core/requestUtils'

const MAX_BYTES_PER_BATCH = 3_000_000 // 3MB

export async function batchedArtifactsUpload(
	artifacts: Artifact[],
	secretApiKey: string,
	projectId: string
) {
	const batches: Artifact[][] = []
	let currentBatch: Artifact[] = []
	let currentBatchSize = 0

	// A rough approximation
	const artifactSizeInBytes = (artifact: Artifact) => JSON.stringify(artifact).length

	// Batching artifacts by size
	for (const artifact of artifacts) {
		const artifactSize = artifactSizeInBytes(artifact)

		// If adding the current string to the current batch exceeds the maxBytes,
		// push the current batch to batches and start a new batch
		if (currentBatchSize + artifactSize > MAX_BYTES_PER_BATCH) {
			if (currentBatch.length > 0) {
				batches.push(currentBatch)
			}
			currentBatch = []
			currentBatchSize = 0
		}

		// Handle the edge case where the artifact itself exceeds maxBytes
		if (artifactSize > MAX_BYTES_PER_BATCH) {
			batches.push([artifact])
			continue
		}

		currentBatch.push(artifact)
		currentBatchSize += artifactSize
	}

	// Add any left overs in the current batch
	batches.push(currentBatch)

	const uploadBatchesRequests = await Promise.all(
		batches.map(
			async (batch) =>
				await request<string[]>(
					`${getApiBase()}/api/v1/artifacts/${projectId}`,
					'POST',
					JSON.stringify({
						projectId,
						artifacts: batch
					}),
					{
						headers: new Headers({
							Authorization: `Bearer ${secretApiKey}`,
							'Content-Type': 'application/json'
						})
					}
				)
		)
	)

	return Result.all(...uploadBatchesRequests)
}

export async function batchedArtifactsUploadByBuildId(
	artifacts: Artifact[],
	secretApiKey: string,
	projectId: string,
	buildId: string
) {
	const batches: Artifact[][] = []
	let currentBatch: Artifact[] = []
	let currentBatchSize = 0

	// A rough approximation
	const artifactSizeInBytes = (artifact: Artifact) => JSON.stringify(artifact).length

	// Batching artifacts by size
	for (const artifact of artifacts) {
		const artifactSize = artifactSizeInBytes(artifact)

		// If adding the current string to the current batch exceeds the maxBytes,
		// push the current batch to batches and start a new batch
		if (currentBatchSize + artifactSize > MAX_BYTES_PER_BATCH) {
			if (currentBatch.length > 0) {
				batches.push(currentBatch)
			}
			currentBatch = []
			currentBatchSize = 0
		}

		// Handle the edge case where the artifact itself exceeds maxBytes
		if (artifactSize > MAX_BYTES_PER_BATCH) {
			batches.push([artifact])
			continue
		}

		currentBatch.push(artifact)
		currentBatchSize += artifactSize
	}

	// Add any left overs in the current batch
	batches.push(currentBatch)

	const uploadBatchesRequests = await Promise.all(
		batches.map(
			async (batch) =>
				await request<string[][]>(
					`${getApiBase()}/api/v1/artifacts/upload-diff/${projectId}`,
					'POST',
					JSON.stringify({
						projectId,
						buildId,
						artifacts: batch
					}),
					{
						headers: new Headers({
							Authorization: `Bearer ${secretApiKey}`,
							'Content-Type': 'application/json'
						})
					}
				)
		)
	)

	return Result.all(...uploadBatchesRequests)
}
