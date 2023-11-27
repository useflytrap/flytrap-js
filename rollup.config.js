import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve';
import alias from '@rollup/plugin-alias';

const RESOLVED_PACKAGES = [
	'serialize-error',
	'pkg-dir',
	'find-up',
	'locate-path',
	'p-locate',
	'p-limit',
	'path-exists',
	'yocto-queue',
	'ts-results'
];

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
	/**
	 * Build replay package. The replay package is just the 
	 * normal Flytrap SDK but with some modifications to
	 * add replaying functionality.
	 */
	{
		input: ["src/index.ts"],
		plugins: [
			alias({
				entries: [
					{ find: './core/noop', replacement: './replay' }
				]
			}),
			nodeResolve({
			preferBuiltins: false,
		}), json(), esbuild(), commonjs()],
		output: [
			{
				dir: "replay",
				entryFileNames: "[name].mjs",
				format: "esm",
				exports: "named",
				sourcemap: true,
			},
			{
				dir: "replay",
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
				dir: "replay",
				entryFileNames: "[name].d.ts",
				format: "esm",
				exports: "named",
			},
		],
	},
	// Build transform plugin
	{
		input: ["src/transform.ts"],
		plugins: [nodeResolve({
			preferBuiltins: false,
			resolveOnly: RESOLVED_PACKAGES
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
