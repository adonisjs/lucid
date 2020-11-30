require('@adonisjs/require-ts/build/register')

const { configure } = require('japa')
configure({
	files: ['test/**/*.spec.ts', '!test/database/drop-tables.spec.ts'],
	after: [
		async () => {
			await require('fs-extra').remove(require('path').join(__dirname, 'test-helpers', 'tmp'))
		},
	],
})
