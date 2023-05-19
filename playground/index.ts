import assert from "assert";
import { useFlytrapCall } from "useflytrap";

const logOutput = useFlytrapCall(console, {
	args: ['hello', 'world'],
	id: 'console-log',
	name: 'log'
})

assert.strictEqual(logOutput, undefined)
