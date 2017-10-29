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
const { ioc, registrar } = require('@adonisjs/fold')
const { Config, setupResolver, Helpers } = require('@adonisjs/sink')

const helpers = require('../unit/helpers')
const Seed = require('../../commands/Seed')

test.group('Seed Database', (group) => {
  group.before(async () => {
    ioc.bind('Adonis/Src/Config', () => {
      const config = new Config()
      config.set('database', {
        connection: 'testing',
        testing: helpers.getConfig()
      })
      return config
    })

    ioc.bind('Adonis/Src/Helpers', () => {
      return new Helpers(path.join(__dirname))
    })

    await fs.ensureDir(path.join(__dirname, 'database/seeds'))

    await registrar
      .providers([
        path.join(__dirname, '../../providers/LucidProvider'),
        path.join(__dirname, '../../providers/MigrationsProvider')
      ]).registerAndBoot()

    await fs.ensureDir(path.join(__dirname, '../unit/tmp'))
    await helpers.createTables(ioc.use('Database'))
    setupResolver()
  })

  group.afterEach(async () => {
    ace.commands = {}

    try {
      await fs.remove(path.join(__dirname, 'database'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  })

  group.after(async () => {
    await helpers.dropTables(ioc.use('Database'))
    ioc.use('Database').close()

    try {
      await fs.remove(path.join(__dirname, '../unit/tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('skip when there are no seed files', async (assert) => {
    ace.addCommand(Seed)
    const result = await ace.call('seed')
    assert.equal(result, 'Nothing to seed')
  })

  test('run seeds in sequence', async (assert) => {
    ace.addCommand(Seed)
    const g = global || GLOBAL
    g.stack = []

    await fs.outputFile(path.join(__dirname, 'database/seeds/bar.js'), `
      class Seed {
        run () {
          return new Promise((resolve) => {
            setTimeout(() => {
              (global || GLOBAL).stack.push('bar')
              resolve()
            }, 10)
          })
        }
      }
      module.exports = Seed
    `)

    await fs.outputFile(path.join(__dirname, 'database/seeds/baz.js'), `
      class Seed {
        run () {
          (global || GLOBAL).stack.push('baz')
        }
      }
      module.exports = Seed
    `)

    await ace.call('seed')
    assert.deepEqual(global.stack, ['bar', 'baz'])
  })

  test('run only selected files', async (assert) => {
    ace.addCommand(Seed)
    const g = global || GLOBAL
    g.stack = []

    await fs.outputFile(path.join(__dirname, 'database/seeds/bar.js'), `
      class Seed {
        run () {
          return new Promise((resolve) => {
            setTimeout(() => {
              (global || GLOBAL).stack.push('bar')
              resolve()
            }, 10)
          })
        }
      }
      module.exports = Seed
    `)

    await fs.outputFile(path.join(__dirname, 'database/seeds/foo.js'), `
      class Seed {
        run () {
          (global || GLOBAL).stack.push('foo')
        }
      }
      module.exports = Seed
    `)

    await ace.call('seed', {}, { files: 'foo.js' })
    assert.deepEqual(global.stack, ['foo'])
  })

  test('run only js files', async (assert) => {
    ace.addCommand(Seed)
    const g = global || GLOBAL
    g.stack = []

    await fs.outputFile(path.join(__dirname, 'database/seeds/bar.js'), `
      class Seed {
        run () {
          return new Promise((resolve) => {
            setTimeout(() => {
              (global || GLOBAL).stack.push('bar')
              resolve()
            }, 10)
          })
        }
      }
      module.exports = Seed
    `)

    await fs.outputFile(path.join(__dirname, 'database/seeds/.bar.js.swp'), `
      class Seed {
        run () {
          (global || GLOBAL).stack.push('foo')
        }
      }
      module.exports = Seed
    `)

    await ace.call('seed')
    assert.deepEqual(global.stack, ['bar'])
  })
})
