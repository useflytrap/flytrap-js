/// <reference types="vitest" />

import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

export default defineConfig({
	resolve: {
		alias: {
			useflytrap: fileURLToPath(new URL('./src/index.ts', import.meta.url).href)
		}
	},
	// @ts-ignore
	test: {
		coverage: {
			'100': true,
			include: ['src'],
			reporter: ['text', 'json', 'html']
		},
		exclude: [
			...configDefaults.exclude,
			'e2e/*'
		]
	}
})
