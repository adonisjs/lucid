/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { MigrationSource } from '../../src/migrator/migration_source.js'
import { setup, getDb, resetTables } from '../../test-helpers/index.js'
import { AppFactory } from '@adonisjs/core/factories/app'
import { join } from 'node:path'

test.group('MigrationSource', (group) => {
  group.each.setup(async () => {
    await setup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('get list of migration files from database/migrations directory', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()

    const db = getDb()
    const migrationSource = new MigrationSource(db.getRawConnection('primary')!.config, app)

    await fs.create('database/migrations/foo.js', 'module.exports = class Foo {}')
    await fs.create('database/migrations/bar.js', 'module.exports = class Bar {}')

    const directories = await migrationSource.getMigrations()

    assert.deepEqual(
      directories.map((file) => {
        return { absPath: file.absPath, name: file.name }
      }),
      [
        {
          absPath: join(fs.basePath, 'database/migrations/bar.js'),
          name: 'database/migrations/bar',
        },
        {
          absPath: join(fs.basePath, 'database/migrations/foo.js'),
          name: 'database/migrations/foo',
        },
      ]
    )
  })

  test('only collect javascript files for migration', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()

    const db = getDb()
    const migrationSource = new MigrationSource(db.getRawConnection('primary')!.config, app)

    await fs.create('database/migrations/foo.js', 'module.exports = class Foo {}')
    await fs.create('database/migrations/foo.js.map', '{}')

    const directories = await migrationSource.getMigrations()

    assert.deepEqual(
      directories.map((file) => {
        return { absPath: file.absPath, name: file.name }
      }),
      [
        {
          absPath: join(fs.basePath, 'database/migrations/foo.js'),
          name: 'database/migrations/foo',
        },
      ]
    )
  })

  test('sort multiple migration directories seperately', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()

    const config = Object.assign({}, db.getRawConnection('primary')!.config, {
      migrations: {
        paths: ['./database/secondary', './database/primary'],
      },
    })

    const migrationSource = new MigrationSource(config, app)

    await fs.create('database/secondary/a.js', 'module.exports = class Foo {}')
    await fs.create('database/secondary/c.js', 'module.exports = class Bar {}')

    await fs.create('database/primary/b.js', 'module.exports = class Foo {}')
    await fs.create('database/primary/d.js', 'module.exports = class Bar {}')

    const files = await migrationSource.getMigrations()

    assert.deepEqual(
      files.map((file) => {
        return { absPath: file.absPath, name: file.name }
      }),
      [
        {
          absPath: join(fs.basePath, 'database/secondary/a.js'),
          name: 'database/secondary/a',
        },
        {
          absPath: join(fs.basePath, 'database/secondary/c.js'),
          name: 'database/secondary/c',
        },
        {
          absPath: join(fs.basePath, 'database/primary/b.js'),
          name: 'database/primary/b',
        },
        {
          absPath: join(fs.basePath, 'database/primary/d.js'),
          name: 'database/primary/d',
        },
      ]
    )
  })

  test('handle esm default exports properly', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()

    const migrationSource = new MigrationSource(db.getRawConnection('primary')!.config, app)

    await fs.create('database/migrations/foo.ts', 'export default class Foo {}')
    await fs.create('database/migrations/bar.ts', 'export default class Bar {}')
    await fs.create('database/migrations/baz.ts', 'export default class Baz {}')

    const directories = await migrationSource.getMigrations()
    console.log(await directories[0].getSource())
    // assert.equal((await directories[0].getSource()).name, 'Bar')
    // assert.equal(await directories[1].getSource().name, 'Baz')
    // assert.equal(await directories[2].getSource().name, 'Foo')
  })
})
