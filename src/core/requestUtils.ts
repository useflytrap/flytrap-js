import { Err, Ok } from 'ts-results'
import { log } from './logging'
import { formatBytes } from './util'
import { createHumanLog } from './errors'

export async function newRequest<DataType = unknown>(
	endpoint: string,
	method: 'POST' | 'GET' | 'PUT' | 'DELETE',
	body?: BodyInit,
	options: RequestInit = {}
) {
	log.info(
		'api-calls',
		`[${method}] ${endpoint} - ${body ? `Size: ${formatBytes(JSON.stringify(body).length)}` : ''}.`,
		{ payload: body }
	)
	try {
		const data = await fetch(endpoint, {
			...options,
			method,
			headers: {
				accept: 'application/json',
				'content-type': 'application/json'
			},
			...(options.headers && { headers: options.headers }),
			body
		})
		if (data.status >= 400 && data.status < 600) throw await data.text()
		return Ok(data.json() as DataType)
	} catch (error) {
		return Err(
			createHumanLog({
				explanations: ['request_failed'],
				params: {
					endpoint,
					method,
					error: String(error)
				}
			})
		)
	}
}
