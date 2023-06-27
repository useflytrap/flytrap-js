import typescript from '@rollup/plugin-typescript'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { FlytrapTransformPlugin } from 'useflytrap/transform'

export default {
	input: 'src/index.ts',
	output: {
		file: 'dist/index.cjs',
		format: 'cjs'
	},
	plugins: [
		typescript(),
		// Add Flytrap code transform plugin
		FlytrapTransformPlugin.rollup(),
		nodeResolve({ preferBuiltins: true, extensions: ['.mjs', '.js', '.json', '.node', '.ts'] }),
		commonjs()
	],
	external: ['express']
}
