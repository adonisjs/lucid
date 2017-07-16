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
const MigrationRun = require('../../commands/MigrationRun')

test.group('Migration Run', (group) => {
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

    await fs.ensureDir(path.join(__dirname, 'database/migrations'))

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
    await ioc.use('Database').table('adonis_schema').truncate()
    await ioc.use('Database').schema.dropTableIfExists('schema_users')
  })

  group.after(async () => {
    await helpers.dropTables(ioc.use('Database'))
    await ioc.use('Database').schema.dropTableIfExists('adonis_schema')
    ioc.use('Database').close()

    try {
      await fs.remove(path.join(__dirname, '../unit/tmp'))
      await fs.remove(path.join(__dirname, 'database'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('skip when there are no schema files', async (assert) => {
    ace.addCommand(MigrationRun)
    const result = await ace.call('migration:run')
    assert.deepEqual(result, { migrated: [], status: 'skipped', queries: undefined })
  })

  test('run migrations by requiring all schema files', async (assert) => {
    ace.addCommand(MigrationRun)
    await fs.writeFile(path.join(__dirname, 'database/migrations/User.js'), `
      const Schema = use('Schema')
      class User extends Schema {
        up () {
          this.createTable('schema_users', (table) => {
            table.increments()
            table.string('username')
          })
        }
      }

      module.exports = User
    `)

    const result = await ace.call('migration:run')
    assert.deepEqual(result, { migrated: ['User'], status: 'completed', queries: undefined })
    const migrations = await ioc.use('Database').table('adonis_schema')
    assert.lengthOf(migrations, 1)
    assert.equal(migrations[0].batch, 1)
    assert.equal(migrations[0].name, 'User')
  })

  test('log queries when asked to log', async (assert) => {
    ace.addCommand(MigrationRun)
    await fs.writeFile(path.join(__dirname, 'database/migrations/User.js'), `
      const Schema = use('Schema')
      class User extends Schema {
        up () {
          this.createTable('schema_users', (table) => {
            table.increments()
            table.string('username')
          })
        }
      }

      module.exports = User
    `)

    const result = await ace.call('migration:run', {}, { log: true })
    const migrations = await ioc.use('Database').table('adonis_schema')
    assert.lengthOf(migrations, 0)
    assert.isArray(result.queries)
  })
})
