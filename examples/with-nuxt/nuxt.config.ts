import { FlytrapTransformPlugin } from 'useflytrap/transform'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	vite: {
		plugins: [FlytrapTransformPlugin.vite()]
	}
})
