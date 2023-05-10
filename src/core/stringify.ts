import SuperJSON from 'superjson'
import { tryCatchSync } from './util'

export type Node = any

export type WalkerContext = {
	skip: () => void
	remove: () => void
	replace: (node: Node) => void
}

export type WalkerValues = {
	parent?: Node | null
	prop?: Node | null
	index?: number | null
	node: Node
}

export class WalkerBase {
	protected should_skip = false
	protected should_remove = false
	protected replacement: Node = null

	protected context: WalkerContext

	constructor() {
		this.context = {
			skip: () => (this.should_skip = true),
			remove: () => (this.should_remove = true),
			replace: (node) => (this.replacement = node)
		}
	}

	replace({ parent, prop, index, node }: WalkerValues) {
		if (parent && prop) {
			if (index != null) {
				parent[prop][index] = node
			} else {
				parent[prop] = node
			}
		}
	}

	remove({ parent, prop, index }: Omit<WalkerValues, 'node'>) {
		if (parent && prop) {
			if (index !== null && index !== undefined) {
				/** @type {Array<Node>} */ parent[prop].splice(index, 1)
			} else {
				delete parent[prop]
			}
		}
	}
}

export type SyncHandler = (
	this: WalkerContext,
	val: {
		// this: WalkerContext
		// this: WalkerContext;
		node: Node
		parent: Node | null
		key?: string | number | symbol | null
		index?: number | null
	}
) => void

export type VisitValues = {
	node: Node
	parent: Node | null
	prop?: keyof Node | null
	index?: number | null
}

/**
 * @template {Node} Parent
 * @param {Node} node
 * @param {Parent | null} parent
 * @param {keyof Parent} [prop]
 * @param {number | null} [index]
 * @returns {Node | null}
 */

export class SyncWalker extends WalkerBase {
	private readonly enter: SyncHandler | undefined
	private readonly leave: SyncHandler | undefined

	constructor(enter?: SyncHandler, leave?: SyncHandler) {
		super()

		this.should_skip = false

		this.should_remove = false

		this.replacement = null

		this.context = {
			skip: () => (this.should_skip = true),
			remove: () => (this.should_remove = true),
			replace: (node) => (this.replacement = node)
		}

		this.enter = enter

		this.leave = leave
	}

	visit({ node, parent, prop, index }: VisitValues) {
		if (node) {
			if (this.enter) {
				const _should_skip = this.should_skip
				const _should_remove = this.should_remove
				const _replacement = this.replacement
				this.should_skip = false
				this.should_remove = false
				this.replacement = null

				this.enter.call(this.context, { node, parent, key: prop, index })

				if (this.replacement) {
					node = this.replacement
					this.replace({ parent, prop, index, node })
				}

				if (this.should_remove) {
					this.remove({ parent, prop, index })
				}

				const skipped = this.should_skip
				const removed = this.should_remove

				this.should_skip = _should_skip
				this.should_remove = _should_remove
				this.replacement = _replacement

				if (skipped) return node
				if (removed) return null
			}

			/** @type {keyof Node} */
			let key

			for (key in node) {
				/** @type {unknown} */
				const value = node[key]

				if (value && typeof value === 'object') {
					if (Array.isArray(value)) {
						const nodes = /** @type {Array<unknown>} */ value
						for (let i = 0; i < nodes.length; i += 1) {
							const item = nodes[i]
							if (isNode(item)) {
								// item, node, key, i
								if (!this.visit({ node: item, parent: node, prop: key, index: i })) {
									// removed
									i--
								}
							}
						}
					} else if (isNode(value)) {
						// this.visit(value, node, key, null);
						this.visit({ node: value, parent: node, prop: key, index: null })
					}
				}
			}

			if (this.leave) {
				const _replacement = this.replacement
				const _should_remove = this.should_remove
				this.replacement = null
				this.should_remove = false

				this.leave.call(this.context, { node, parent, key: prop, index })

				if (this.replacement) {
					node = this.replacement
					this.replace({ parent, prop, index, node })
				}

				if (this.should_remove) {
					this.remove({ parent, prop, index })
				}

				const removed = this.should_remove

				this.replacement = _replacement
				this.should_remove = _should_remove

				if (removed) return null
			}
		}

		return node
	}
}

function isNode(item: any) {
	return item !== null
}

export function walk(ast: Node, { enter, leave }: { enter?: SyncHandler; leave?: SyncHandler }) {
	const instance = new SyncWalker(enter, leave)
	return instance.visit({ node: ast, parent: null })
}

/**
 * Used to stringify complex data structures
 * TODO(skoshx): implement this properly,
 */
export function flytrapStringify(data: any) {
	const walked = walk(data, {
		enter(this, { node }) {
			const { error } = tryCatchSync(() => SuperJSON.stringify(node))
			if (error) this.replace('FLYTRAP_REMOVED')
		}
	})

	return SuperJSON.stringify(walked)
}
