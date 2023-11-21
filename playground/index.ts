import assert from "assert";
import { ufc } from "useflytrap";

const logOutput = ufc(console, {
	args: ['hello', 'world'],
	id: 'console-log',
	name: 'log'
})

assert.strictEqual(logOutput, undefined)
