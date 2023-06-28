import { build } from 'esbuild'
import { FlytrapTransformPlugin } from 'useflytrap/transform'

await build({
	entryPoints: ['./src/index.ts'],
	outdir: 'dist',
	outExtension: {
		'.js': '.cjs'
	},
	format: 'cjs',
	bundle: true,
	platform: 'node',
	target: 'node18',
	packages: 'external',
	plugins: [FlytrapTransformPlugin.esbuild()]
})
