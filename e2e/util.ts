import { getApiBase } from "../src/core/config";

// Capturing
export const NEXTJS_API_PORT = 3000;
export const NEXTJS_PORT = 3001;
export const SVELTE_PORT = 3002;
export const NUXT_PORT = 3003;
// Replaying
export const REPLAY_NEXTJS_API_PORT = 3004;
export const REPLAY_NEXTJS_PORT = 3005;
export const REPLAY_SVELTE_PORT = 3006;
export const REPLAY_NUXT_PORT = 3007;

export const getBaseUrl = (port: number) => `http://localhost:${port}`;
export const waitMs = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function fetchCaptures(secretApiKey: string): Promise<any[]> {
	const response = await (await fetch(`${getApiBase()}/api/v1/captures`, {
		headers: new Headers({
			Authorization: `Bearer ${secretApiKey}`
		})
	})).json()
	return response as any[]
}

export function getLatestCapture(captures: any[], testStartTime: Date): any | undefined {
	return captures.find((capture) => new Date(capture.createdAt).getTime() > testStartTime.getTime());
}
