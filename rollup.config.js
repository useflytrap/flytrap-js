import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve';

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
	{
		input: ["src/transform.ts"],
		plugins: [json(), esbuild(), commonjs()],
		output: [
			{
				dir: "transform",
				entryFileNames: "[name].mjs",
				format: "esm",
				exports: "named",
				sourcemap: true,
			},
			{
				dir: "transform",
				entryFileNames: "[name].cjs",
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
				entryFileNames: "[name].d.ts",
				format: "esm",
				exports: "named",
			},
		],
	},
]
