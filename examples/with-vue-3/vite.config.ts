import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { FlytrapTransformPlugin } from 'useflytrap/transform'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [FlytrapTransformPlugin.vite(), vue(), vueJsx()],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url))
		}
	}
})
