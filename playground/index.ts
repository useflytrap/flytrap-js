import assert from "assert";
import { useFlytrapCall } from "useflytrap";

const logOutput = useFlytrapCall(console, {
	args: ['hello', 'world'],
	filePath: '/file.js',
	id: 'console-log',
	name: 'log',
	lineNumber: 1,
	scopes: []
})

assert.strictEqual(logOutput, undefined)
