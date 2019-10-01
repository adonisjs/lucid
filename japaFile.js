require('ts-node/register')

const { configure } = require('japa')
configure({
  files: ['test/**/*.spec.ts'],
  after: [async () => {
    await require('fs-extra').remove(require('path').join(__dirname, 'test-helpers', 'tmp'))
  }]
})
