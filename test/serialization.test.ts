import { describe, expect, it, test } from 'vitest'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { safeParse, safeStringify } from '../src/core/stringify'
GlobalRegistrator.register()

export interface ErrorWithBatchIndex {
	batchRequestIdx?: number
}

type KnownErrorParams = {
	code: string
	clientVersion: string
	meta?: Record<string, unknown>
	batchRequestIdx?: number
}

export class PrismaClientKnownRequestError extends Error implements ErrorWithBatchIndex {
	code: string
	meta?: Record<string, unknown>
	clientVersion: string
	batchRequestIdx?: number

	constructor(message: string, { code, clientVersion, meta, batchRequestIdx }: KnownErrorParams) {
		super(message)
		this.name = 'PrismaClientKnownRequestError'

		this.code = code
		this.clientVersion = clientVersion
		this.meta = meta
		Object.defineProperty(this, 'batchRequestIdx', {
			value: batchRequestIdx,
			enumerable: false,
			writable: true
		})
	}
	get [Symbol.toStringTag]() {
		return 'PrismaClientKnownRequestError'
	}
}

type Test = {
	name: string
	value: any
}
type SerializationTestFixtures = Record<string, Record<string, Test[]>>

const serializationTestFixtures: SerializationTestFixtures = {
	'Fetch APIs': {
		Response: [
			{
				name: 'Headers',
				value: new Response('a', { headers: new Headers({ foo: 'bar' }) })
			},
			{
				name: 'Status',
				value: new Response('a', { status: 200 })
			},
			{
				name: 'Status Text',
				value: new Response('a', { status: 200, statusText: 'Hello World' })
			},
			{
				name: 'Body',
				value: new Response('Hello World')
			}
		],
		Request: [
			{
				name: 'Headers',
				value: new Request('https://www.useflytrap.com', { headers: new Headers({ foo: 'bar' }) })
			},
			{
				name: 'Body',
				value: new Request('https://www.useflytrap.com')
			},
			{
				name: 'Method',
				value: new Request('https://www.useflytrap.com', { method: 'GET' })
			},
			{
				name: 'Method (Invalid)',
				value: new Request('https://www.useflytrap.com', { method: 'invalid' })
			},
			{
				name: 'URL',
				value: new Request(new URL('https://www.useflytrap.com'))
			},
			{
				name: 'RequestInfo',
				value: new Request('https://www.useflytrap.com')
			}
		],
		Headers: [
			{
				name: 'Headers',
				value: new Headers({ foo: 'bar' })
			},
			{
				name: 'Headers (Array)',
				value: new Headers([
					['foo', 'bar'],
					['hello', 'world']
				])
			},
			{
				name: 'Headers (Headers)',
				value: new Headers(new Headers({ foo: 'bar' }))
			}
		]
	},
	Errors: {
		Error: [
			{
				name: 'Error',
				value: new Error('Hello World')
			},
			{
				name: 'Error (Options)',
				value: new Error('Hello World', { cause: 'foobar' })
			},
			{
				name: 'Error (Prisma)',
				value: new PrismaClientKnownRequestError('Hello World', {
					code: 'P2025',
					clientVersion: ''
				})
			}
		]
	}
}

async function isMatchingResponse(a: Response, b: Response) {
	if (a.bodyUsed || b.bodyUsed) {
		throw new Error('Response body already read.')
	}

	// headers
	expect(a.headers).toEqual(b.headers)

	// body
	expect(await a.text()).toEqual(await b.text())
	expect(a.status).toEqual(b.status)
	expect(a.statusText).toEqual(b.statusText)
}

async function isMatchingRequest(a: Request, b: Request) {
	if (a.bodyUsed || b.bodyUsed) {
		throw new Error('Request body already read.')
	}

	// headers
	expect(a.headers).toEqual(b.headers)

	// body
	expect(await a.text()).toEqual(await b.text())
	expect(a.method).toEqual(b.method)
	expect(a.url).toEqual(b.url)
}

for (const [describeName, testObject] of Object.entries(serializationTestFixtures)) {
	describe.skip(describeName, () => {
		for (const [testName, testFixtures] of Object.entries(testObject)) {
			test(testName, async () => {
				for (let i = 0; i < testFixtures.length; i++) {
					const parsed = safeParse(safeStringify(testFixtures[i].value).unwrap()).unwrap()
					if (parsed instanceof Response) {
						isMatchingResponse(parsed, testFixtures[i].value)
					} else if (parsed instanceof Request) {
						isMatchingRequest(parsed, testFixtures[i].value)
					} else {
						expect(safeParse(safeStringify(testFixtures[i].value).unwrap()).unwrap()).toEqual(
							testFixtures[i].value
						)
					}
				}
			})
		}
	})
}
