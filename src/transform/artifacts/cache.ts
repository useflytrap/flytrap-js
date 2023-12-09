import { getApiBase } from '../../core/config'
import { batchedArtifactsUpload } from './batchedArtifactsUpload'
import { Artifact } from '../../core/types'
import { request } from '../../core/requestUtils'

const getUploadedArtifacts = async (
	projectId: string,
	secretApiKey: string,
	checksums: string[]
) => {
	return await request<{ checksum: string; filePath: string }[]>(
		`${getApiBase()}/api/v1/artifacts/list-uploaded/${projectId}`,
		'POST',
		JSON.stringify({ checksums, projectId }),
		{
			headers: new Headers({
				Authorization: `Bearer ${secretApiKey}`,
				'Content-Type': 'application/json'
			})
		}
	)
}

export async function upsertArtifacts(
	projectId: string,
	secretApiKey: string,
	artifacts: Artifact[]
) {
	const existingChecksums = artifacts.map((a) => a.checksum)
	const artifactsToUpload = (
		await getUploadedArtifacts(projectId, secretApiKey, existingChecksums)
	).map((uploadedArtifactsResult) =>
		artifacts.filter(
			(a) => uploadedArtifactsResult.find((ua) => ua.checksum === a.checksum) === undefined
		)
	)

	if (artifactsToUpload.err) {
		return artifactsToUpload
	}

	return await batchedArtifactsUpload(artifactsToUpload.val, secretApiKey, projectId)
}
