import { FlytrapTransformPlugin } from 'useflytrap/transform'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [FlytrapTransformPlugin.vite(), sveltekit()]
})
