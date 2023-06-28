// @ts-check
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const { FlytrapTransformPlugin } = require('useflytrap/transform');

/** @type { import('webpack').Configuration } */
module.exports = {
  target: 'node',
	mode: 'production',
  externals: [nodeExternals()],
  entry: {
    app: './src/index.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].cjs'
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          'ts-loader',
        ],
      },
    ],
  },
	plugins: [
		FlytrapTransformPlugin.webpack()
	]
};
