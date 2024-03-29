module.exports = {
	env: {
		browser: true,
		es6: true,
		node: true
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		sourceType: 'module'
	},
	plugins: ['@typescript-eslint'],
	extends: [
		'plugin:@typescript-eslint/recommended',
		'eslint:recommended',
		// 'plugin:prettier/recommended',
		// 'prettier'
	],
	rules: {
		// we need this for isomorphic code unfortunately
		'@typescript-eslint/no-var-requires': 'off',
		'@typescript-eslint/ban-ts-comment': 'off',
		'@typescript-eslint/ban-types': 'off',
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/explicit-module-boundary-types': 'off',
		'@typescript-eslint/no-inferrable-types': 1,
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-unused-vars': 1,
		'no-unused-vars': 'off',
		'no-undef': 'off',
		'no-redeclare': 'off',
		'no-mixed-spaces-and-tabs': 'off'
	}
}
