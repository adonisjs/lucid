/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import test from 'japa'
import { join } from 'path'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { MigrationSource } from '../../src/Migrator/MigrationSource'
import { setup, getDb, resetTables, setupApplication, fs } from '../../test-helpers'

let app: ApplicationContract
let db: ReturnType<typeof getDb>

test.group('MigrationSource', (group) => {
  group.beforeEach(async () => {
    app = await setupApplication()
    db = getDb(app)
    await setup()
  })

  group.afterEach(async () => {
    await db.manager.closeAll()
    await resetTables()
    await fs.cleanup()
  })

  test('get list of migration files from database/migrations.js', async (assert) => {
    const migrationSource = new MigrationSource(db.getRawConnection('primary')!.config, app)

    await fs.add('database/migrations/foo.js', 'module.exports = class Foo {}')
    await fs.add('database/migrations/bar.js', 'module.exports = class Bar {}')

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

  test('only use javascript files for migration', async (assert) => {
    const migrationSource = new MigrationSource(db.getRawConnection('primary')!.config, app)

    await fs.add('database/migrations/foo.js', 'module.exports = class Foo {}')
    await fs.add('database/migrations/foo.js.map', '{}')

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

  test('sort multiple migration directories seperately', async (assert) => {
    const config = Object.assign({}, db.getRawConnection('primary')!.config, {
      migrations: {
        paths: ['./database/secondary', './database/primary'],
      },
    })

    const migrationSource = new MigrationSource(config, app)

    await fs.add('database/secondary/a.js', 'module.exports = class Foo {}')
    await fs.add('database/secondary/c.js', 'module.exports = class Bar {}')

    await fs.add('database/primary/b.js', 'module.exports = class Foo {}')
    await fs.add('database/primary/d.js', 'module.exports = class Bar {}')

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

  test('handle esm default exports properly', async (assert) => {
    const migrationSource = new MigrationSource(db.getRawConnection('primary')!.config, app)

    await fs.add('database/migrations/foo.ts', 'export default class Foo {}')
    await fs.add('database/migrations/bar.ts', 'export default class Bar {}')
    await fs.add('database/migrations/baz.ts', 'export default class Baz {}')

    const directories = await migrationSource.getMigrations()
    assert.equal((directories[0].getSource() as any).name, 'Bar')
    assert.equal((directories[1].getSource() as any).name, 'Baz')
    assert.equal((directories[2].getSource() as any).name, 'Foo')
  })
})
