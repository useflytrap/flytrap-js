import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import alias from '@rollup/plugin-alias';


/** @type {import('rollup').RollupOptions[]} */
export default [
	{
		input: ["src/index.ts"],
		plugins: [nodeResolve({
			preferBuiltins: false,
		}), json(), esbuild(), commonjs()],
		output: [
			{
				dir: "dist",
				entryFileNames: "[name].mjs",
				format: "esm",
				exports: "named",
				sourcemap: true,
			},
			{
				dir: "dist",
				entryFileNames: "[name].cjs",
				format: "cjs",
				exports: "named",
				sourcemap: true,
			},
		],
	},
	{
		input: ["src/index.ts"],
		plugins: [dts()],
		output: [
			{
				dir: "dist",
				entryFileNames: "[name].d.ts",
				format: "esm",
				exports: "named",
			},
		],
	},
	// Build browser / edge version
	{
		input: ["src/index.ts"],
		plugins: [
			alias({
				entries: [
					{
						find: './core/encryption', replacement: './core/adapters/adapter-browser',
					},
					{
						find: './encryption', replacement: './adapters/adapter-browser',
					},
					{
						find: './persistence/isomorphic', replacement: './persistence/browser'
					}
				]
			}),
			nodeResolve({
			resolveOnly: ['serialize-error', 'pkg-dir', 'find-up', 'locate-path', 'p-locate', 'p-limit', 'path-exists', 'yocto-queue']
		}), json(), esbuild(), commonjs()],
		output: [
			{
				dir: "browser",
				entryFileNames: "index.mjs",
				format: "esm",
				exports: "named",
				sourcemap: true,
			},
			{
				dir: "browser",
				entryFileNames: "index.cjs",
				format: "cjs",
				exports: "named",
				sourcemap: true,
			},
		],
	},
	{
		input: ["src/index.ts"],
		plugins: [dts()],
		output: [
			{
				dir: "browser",
				entryFileNames: "index.d.ts",
				format: "esm",
				exports: "named",
			},
		],
	},
	// Build transform plugin
	{
		input: ["src/transform.ts"],
		plugins: [nodeResolve({
			resolveOnly: ['serialize-error', 'pkg-dir', 'find-up', 'locate-path', 'p-locate', 'p-limit', 'path-exists', 'yocto-queue']
		}), json(), esbuild(), commonjs()],
		output: [
			{
				dir: "transform",
				entryFileNames: "index.mjs",
				format: "esm",
				exports: "named",
				sourcemap: true,
			},
			{
				dir: "transform",
				entryFileNames: "index.cjs",
				format: "cjs",
				exports: "named",
				sourcemap: true,
			},
		],
	},
	{
		input: ["src/transform.ts"],
		plugins: [dts()],
		output: [
			{
				dir: "transform",
				entryFileNames: "index.d.ts",
				format: "esm",
				exports: "named",
			},
		],
	},
]
