// Generate tests using flytrap

/*


describe('Basic', () => {
	// @flytrap-transform-start
	const mockUsers = Array(100).map((x, i) => ({
		id: i,
		email: `john.doe${i}@example.com`,
		firstName: 'John',
		lastName: `Doe ${i}`
	}))

	function getUsers(per_page: number = 10) {
		return mockUsers.slice(0, per_page)
	}

	function findUser(email: string): typeof mockUsers[number] | undefined {
		return getUsers().find((user) => user.email === email)
	}
	// @flytrap-transform-end

	expect(findUser('john.doe1@example.com')).toStrictEqual(...)
})

describe('Supabase', () => {
	test
})

test('S', () => {

})

*/
