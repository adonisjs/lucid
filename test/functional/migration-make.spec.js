'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const ace = require('@adonisjs/ace')
const fs = require('fs-extra')
const path = require('path')
const { ioc } = require('@adonisjs/fold')
const { setupResolver, Helpers } = require('@adonisjs/sink')
const MigrationMake = require('../../commands/MigrationMake')

test.group('Migration Make', (group) => {
  group.before(async () => {
    ioc.bind('Adonis/Src/Helpers', () => {
      return new Helpers(path.join(__dirname))
    })
    setupResolver()
  })

  group.after(async () => {
    try {
      await fs.remove(path.join(__dirname, 'database'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('create migration file', async (assert) => {
    ace.addCommand(MigrationMake)
    const result = await ace.call('make:migration', { name: 'Users' }, { action: 'create' })
    const exists = await fs.pathExists(result)
    assert.isTrue(exists)
  })
})
