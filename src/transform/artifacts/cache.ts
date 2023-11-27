import { getApiBase } from '../../core/config'
import { batchedArtifactsUpload } from './batchedArtifactsUpload'
import { Artifact } from '../../core/types'
import { request } from '../../core/requestUtils'

const getUploadedArtifacts = async (projectId: string, secretApiKey: string) => {
	return await request<{ checksum: string; filePath: string }[]>(
		`${getApiBase()}/api/v1/artifacts/${projectId}`,
		'GET',
		undefined,
		{
			headers: new Headers({
				Authorization: `Bearer ${secretApiKey}`,
				'Content-Type': 'application/json'
			})
		}
	)
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
	const artifactsToUpload = (await getUploadedArtifacts(projectId, secretApiKey)).map(
		(uploadedArtifactsResult) => getArtifactsToUpload(uploadedArtifactsResult, artifacts)
	)

	if (artifactsToUpload.err) {
		return artifactsToUpload
	}

	return await batchedArtifactsUpload(artifactsToUpload.val, secretApiKey, projectId)
}
