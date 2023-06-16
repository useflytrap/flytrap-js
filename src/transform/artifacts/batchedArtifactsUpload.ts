import { FLYTRAP_API_BASE } from '../../core/config'
import { post } from '../../core/util'
import { Artifact } from '../../exports'

const ARTIFACTS_BATCH_SIZE = 20

export async function batchedArtifactsUpload(
	artifacts: Artifact[],
	secretApiKey: string,
	projectId: string
) {
	const batches: Artifact[][] = []
	for (let i = 0; i < artifacts.length; i += ARTIFACTS_BATCH_SIZE) {
		const artifactsInBatch = artifacts.slice(i, i + ARTIFACTS_BATCH_SIZE)
		batches.push(artifactsInBatch)
	}

	const uploadedArtifactBatches = await Promise.all(
		batches.map(async (batch) => {
			const { data, error } = await post<Artifact>(
				`${FLYTRAP_API_BASE}/api/v1/artifacts/${projectId}`,
				JSON.stringify({
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
