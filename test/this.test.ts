/* eslint-disable */
// @ts-nocheck

import { describe, it, expect } from 'vitest'
import { uff } from '../src/index'

const addAsync = (isAsync: boolean) => (isAsync ? 'async' : '')

;[false, true].forEach((isAsync) => {
	describe(`uff function wrapper${isAsync ? ' (async)' : ''}`, () => {
		it('preserves `this` in arrow functions', () => {
			const context = { value: 'test' }
			var arrowFunc = undefined
			eval(`arrowFunc = ${addAsync(isAsync)}() => this.value`)
			const wrappedArrowFunc = uff(arrowFunc)

			expect(wrappedArrowFunc.call(context)).toStrictEqual(arrowFunc.call(context))
		})

		it('handles `this` correctly in function expressions', () => {
			const context = { value: 'test' }
			var funcExpr = undefined
			eval(`funcExpr = ${addAsync(isAsync)} function() { return this.value; }`)
			const wrappedFuncExpr = uff(funcExpr)

			expect(wrappedFuncExpr.call(context)).toStrictEqual(funcExpr.call(context))
		})

		it('handles `this` correctly in function declarations', () => {
			const context = { value: 'test' }
			if (isAsync) {
				async function declaredFunc() {
					return this.value
				}
				const wrappedDeclaredFunc = uff(declaredFunc)

				expect(wrappedDeclaredFunc.call(context)).toStrictEqual(declaredFunc.call(context))
				return
			}
			function declaredFunc() {
				return this.value
			}
			const wrappedDeclaredFunc = uff(declaredFunc)

			expect(wrappedDeclaredFunc.call(context)).toBe(declaredFunc.call(context))
		})

		it('supports `.bind` with function expressions', () => {
			const context = { value: 'test' }
			var funcExpr = undefined
			eval(`funcExpr = ${addAsync(isAsync)} function() { return this.value; }`)
			const boundFuncExpr = funcExpr.bind(context)
			const wrappedAndBoundFuncExpr = uff(funcExpr).bind(context)

			expect(wrappedAndBoundFuncExpr()).toStrictEqual(boundFuncExpr())
		})

		it('supports `.bind` with function declarations', () => {
			const context = { value: 'test' }

			if (isAsync) {
				async function declaredFunc() {
					return this.value
				}
				const boundDeclaredFunc = declaredFunc.bind(context)
				const wrappedAndBoundDeclaredFunc = uff(declaredFunc).bind(context)

				expect(wrappedAndBoundDeclaredFunc()).toStrictEqual(boundDeclaredFunc())
				return
			}
			function declaredFunc() {
				return this.value
			}
			const boundDeclaredFunc = declaredFunc.bind(context)
			const wrappedAndBoundDeclaredFunc = uff(declaredFunc).bind(context)

			expect(wrappedAndBoundDeclaredFunc()).toBe(boundDeclaredFunc())
		})
	})

	describe(`uff function wrapper with arguments object${isAsync ? ' (async)' : ''}`, () => {
		it('passes `arguments` correctly to function expressions', () => {
			var funcExpr = undefined
			eval(
				`funcExpr = ${addAsync(isAsync)} function () { return Array.from(arguments).join(', '); }`
			)
			const wrappedFuncExpr = uff(funcExpr)

			expect(wrappedFuncExpr('a', 'b', 'c')).toStrictEqual(funcExpr('a', 'b', 'c'))
		})

		it('passes `arguments` correctly to function declarations', () => {
			if (isAsync) {
				async function declaredFunc() {
					return Array.from(arguments).join(', ')
				}
				const wrappedDeclaredFunc = uff(declaredFunc)

				expect(wrappedDeclaredFunc('x', 'y', 'z')).toStrictEqual(declaredFunc('x', 'y', 'z'))
				return
			}
			function declaredFunc() {
				return Array.from(arguments).join(', ')
			}
			const wrappedDeclaredFunc = uff(declaredFunc)

			expect(wrappedDeclaredFunc('x', 'y', 'z')).toBe(declaredFunc('x', 'y', 'z'))
		})

		it('handles `arguments` correctly in nested functions', () => {
			if (isAsync) {
				function outerFunc() {
					return async function () {
						return Array.from(arguments).join(' - ')
					}
				}
				const wrappedOuterFunc = uff(outerFunc())

				expect(wrappedOuterFunc(1, 2, 3)).toStrictEqual(outerFunc()(1, 2, 3))
				return
			}
			function outerFunc() {
				return function () {
					return Array.from(arguments).join(' - ')
				}
			}
			const wrappedOuterFunc = uff(outerFunc())

			expect(wrappedOuterFunc(1, 2, 3)).toBe(outerFunc()(1, 2, 3))
		})

		it('preserves properties of `arguments` object in function expressions', () => {
			var funcExpr = undefined
			eval(`funcExpr = ${addAsync(isAsync)} function () {
				return arguments.length;
			}`)
			const wrappedFuncExpr = uff(funcExpr)

			expect(wrappedFuncExpr('a', 'b', 'c')).toStrictEqual(funcExpr('a', 'b', 'c'))
		})

		it('allows modification of `arguments` object', () => {
			var funcExpr = undefined
			eval(`funcExpr = ${addAsync(isAsync)} function () {
				arguments[0] = 'modified';
				return arguments[0];
			}`)
			const wrappedFuncExpr = uff(funcExpr)

			expect(wrappedFuncExpr('original')).toStrictEqual(funcExpr('original'))
		})
	})
})
