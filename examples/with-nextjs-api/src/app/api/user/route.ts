import { NextResponse } from 'next/server'
import { faker } from '@faker-js/faker'
import { capture } from 'useflytrap'

// @ts-expect-error
const mockUsers = [...Array(100).keys()].map((i) => ({
	userId: `user-${i}`,
	createdAt: new Date(0),
	name: faker.person.fullName()
}))

export type User = (typeof mockUsers)[number]

type ListUsersOptions = {
	per_page: number
	page: number
}

function listUsers(options: ListUsersOptions = { per_page: 50, page: 0 }) {
	return mockUsers.slice(
		options.page * options.per_page,
		options.page * options.per_page + options.per_page
	)
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url)
	const userId = searchParams.get('userId')

	/**
	 * Here we're making an oversight, we should include `{ per_page: 100, page: 0 }` to include
	 * all the users in the "database", we have forgotten it.
	 */
	const users = listUsers()
	// should be; `const users = listUsers({ per_page: 100, page: 0 })`

	const foundUser = users.find((u) => u.userId === userId)

	if (!foundUser) {
		/**
		 * In this example, this should not be able to happen since on the front-end, we are only able to
		 * fetch valid values (userId: `user-[0-99]`). This clause is thus considered as invariant state.
		 * We will place a flytrap capture function here, so in case it happens (which ends up happening)
		 * we are able to see the context, replay and quickly fix the  bug causing the invariant state.
		 */
		await capture({ error: new Error('User not found'), message: '/api/user invariant state, user not found.' })
		return NextResponse.json({ success: false }, { status: 500 })
	}

	return NextResponse.json({ success: true, user: foundUser })
}
