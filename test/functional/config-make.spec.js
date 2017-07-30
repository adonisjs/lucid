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
const MakeConfig = require('../../commands/MakeConfig')

test.group('Make Config', (group) => {
  group.before(async () => {
    ioc.bind('Adonis/Src/Helpers', () => {
      return new Helpers(path.join(__dirname))
    })
    setupResolver()
  })

  group.after(async () => {
    try {
      await fs.remove(path.join(__dirname, 'config'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('create config file', async (assert) => {
    ace.addCommand(MakeConfig)
    const result = await ace.call('config:database')
    const exists = await fs.pathExists(result)
    assert.isTrue(exists)
  })

  test('echo config file to console', async (assert) => {
    ace.addCommand(MakeConfig)
    const result = await ace.call('config:database', {}, { echo: true })
    assert.equal(result, 'echoed')
  })
})
