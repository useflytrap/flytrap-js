import { err, formatBytes, get, ok, tryCatch } from '../../core/util'
import { FLYTRAP_API_BASE } from '../../core/config'
import { log } from '../../core/logging'
import { batchedArtifactsUpload } from './batchedArtifactsUpload'
import { Artifact } from '../../core/types'

const getUploadedArtifacts = async (projectId: string, secretApiKey: string) => {
	const { data, error } = await get<{ checksum: string; filePath: string }[]>(
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
		return err(error ?? `API returned no data.`)
	}

	return ok(data)
}

const getArtifactsToUpload = (
	uploadedArtifacts: { checksum: string; filePath: string }[],
	newArtifacts: Artifact[]
) => {
	type ArtifactApiReturn = { checksum: string; filePath: string }
	const createUniqueKey = (artifact: ArtifactApiReturn) =>
		`${artifact.checksum}-${artifact.filePath}`
	// just take away items where checksum and filePath match
	const existingKeys = new Set(uploadedArtifacts.map(createUniqueKey))

	return newArtifacts.filter((artifact) => !existingKeys.has(createUniqueKey(artifact)))
}

export async function upsertArtifacts(
	projectId: string,
	secretApiKey: string,
	artifacts: Artifact[]
) {
	const { data: uploadedArtifacts, error } = await getUploadedArtifacts(projectId, secretApiKey)
	if (error !== null) {
		return err(error)
	}

	const artifactsToUpload = getArtifactsToUpload(uploadedArtifacts, artifacts)

	// Upload artifacts
	const { data: uploadedBatches, error: uploadError } = await tryCatch(
		batchedArtifactsUpload(artifactsToUpload, secretApiKey, projectId)
	)
	if (uploadError) {
		return err(uploadError as string)
	}
	log.info(
		'storage',
		`Pushed ${
			artifactsToUpload.length
		} artifacts in ${uploadedBatches?.length} batches to the Flytrap API. Payload Size: ${formatBytes(
			JSON.stringify(artifactsToUpload).length
		)}`
	)

	return ok(uploadedBatches)
}
