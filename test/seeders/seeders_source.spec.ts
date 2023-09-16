/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { test } from '@japa/runner'
import { AppFactory } from '@adonisjs/core/factories/app'

import { SeedersSource } from '../../src/seeders_runner/seeders_source.js'
import { getDb, setup, cleanup } from '../../test-helpers/index.js'

test.group('Seeds Source', (group) => {
  group.each.setup(async () => {
    await setup()
  })

  group.each.teardown(async () => {
    await cleanup()
  })

  test('get list of seed files recursively', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()

    const seedersSource = new SeedersSource(db.getRawConnection('primary')!.config, app)

    await fs.create('database/seeders/User.ts', '')
    await fs.create('database/seeders/Tenant/User.ts', '')
    await fs.create('database/seeders/Country/Post.ts', '')

    await db.manager.closeAll()

    const files = await seedersSource.getSeeders()
    assert.deepEqual(
      files.map((file) => {
        return { absPath: file.absPath, name: file.name }
      }),
      [
        {
          absPath: join(fs.basePath, 'database/seeders/Country/Post.ts'),
          name: 'database/seeders/Country/Post',
        },
        {
          absPath: join(fs.basePath, 'database/seeders/Tenant/User.ts'),
          name: 'database/seeders/Tenant/User',
        },
        {
          absPath: join(fs.basePath, 'database/seeders/User.ts'),
          name: 'database/seeders/User',
        },
      ]
    )
  })

  test('only pick .ts/.js files', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()

    const seedersSource = new SeedersSource(db.getRawConnection('primary')!.config, app)

    await fs.create('database/seeders/User.ts', '')
    await fs.create('database/seeders/Tenant/User.ts', '')
    await fs.create('database/seeders/Country/Post.ts', '')
    await fs.create('database/seeders/foo.bar', '')
    await fs.create('database/seeders/foo.js', '')

    await db.manager.closeAll()

    const files = await seedersSource.getSeeders()
    assert.deepEqual(
      files.map((file) => {
        return { absPath: file.absPath, name: file.name }
      }),
      [
        {
          absPath: join(fs.basePath, 'database/seeders/Country/Post.ts'),
          name: 'database/seeders/Country/Post',
        },
        {
          absPath: join(fs.basePath, 'database/seeders/Tenant/User.ts'),
          name: 'database/seeders/Tenant/User',
        },
        {
          absPath: join(fs.basePath, 'database/seeders/User.ts'),
          name: 'database/seeders/User',
        },
        {
          absPath: join(fs.basePath, 'database/seeders/foo.js'),
          name: 'database/seeders/foo',
        },
      ]
    )
  })

  test('sort multiple seeders directories seperately', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()

    const config = Object.assign({}, db.getRawConnection('primary')!.config, {
      seeders: {
        paths: ['./database/secondary', './database/primary'],
      },
    })

    const seedersSource = new SeedersSource(config, app)
    await fs.create('database/secondary/User.ts', '')
    await fs.create('database/secondary/Tenant/User.ts', '')

    await fs.create('database/primary/Account.ts', '')
    await fs.create('database/primary/Team.ts', '')
    await db.manager.closeAll()

    const files = await seedersSource.getSeeders()

    assert.deepEqual(
      files.map((file) => {
        return { absPath: file.absPath, name: file.name }
      }),
      [
        {
          absPath: join(fs.basePath, 'database/secondary/Tenant/User.ts'),
          name: 'database/secondary/Tenant/User',
        },
        {
          absPath: join(fs.basePath, 'database/secondary/User.ts'),
          name: 'database/secondary/User',
        },
        {
          absPath: join(fs.basePath, 'database/primary/Account.ts'),
          name: 'database/primary/Account',
        },
        {
          absPath: join(fs.basePath, 'database/primary/Team.ts'),
          name: 'database/primary/Team',
        },
      ]
    )
  })
})
