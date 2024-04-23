/** @type {import('eslint').Linter.Config} */
module.exports = {
	extends: ['@metacraft/eslint-config'],
	ignorePatterns: ['**/metacraft/', '**/dist/'],
	env: {
		node: true,
	},
};
