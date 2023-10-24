import { getApiBase } from '../../core/config'
import { post } from '../../core/util'
import { Artifact } from '../../exports'

const MAX_BYTES_PER_BATCH = 3_000_000 // 3MB

export async function batchedArtifactsUpload(
	artifacts: Artifact[],
	secretApiKey: string,
	projectId: string
) {
	const batches: Artifact[][] = []
	let currentBatch: Artifact[] = []
	let currentBatchSize = 0

	// a rough approximation
	const artifactSizeInBytes = (artifact: Artifact) => JSON.stringify(artifact).length

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

	// Handle any remaining strings in the current batch
	if (currentBatch.length > 0) {
		batches.push(currentBatch)
	}

	// upload artifacat batches
	const uploadedArtifactBatches = await Promise.all(
		batches.map(async (batch) => {
			const { data, error } = await post<string[]>(
				`${getApiBase()}/api/v1/artifacts/${projectId}`,
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

			if (error || !data) {
				throw error
			}
			return data
		})
	)

	return uploadedArtifactBatches
}
