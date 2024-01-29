import { test } from '@japa/runner'
import { IgnitorFactory } from '@adonisjs/core/factories'

import { defineConfig } from '../src/define_config.js'
import { Database } from '../src/database/main.js'

const BASE_URL = new URL('./tmp/', import.meta.url)
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, BASE_URL).href)
  }
  return import(filePath)
}

test.group('Database Provider', () => {
  test('register database provider', async ({ assert }) => {
    const ignitor = new IgnitorFactory()
      .merge({
        rcFileContents: {
          providers: [() => import('../providers/database_provider.js')],
        },
      })
      .withCoreConfig()
      .withCoreProviders()
      .merge({
        config: {
          database: defineConfig({
            connection: 'sqlite',
            connections: {
              sqlite: {
                client: 'sqlite',
                connection: { filename: new URL('./tmp/database.sqlite', import.meta.url).href },
                migrations: { naturalSort: true, paths: ['database/migrations'] },
              },
            },
          }),
        },
      })
      .create(BASE_URL, { importer: IMPORTER })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    assert.instanceOf(await app.container.make('lucid.db'), Database)
  })

  test('release connection when app is terminating', async ({ assert }) => {
    const ignitor = new IgnitorFactory()
      .merge({
        rcFileContents: {
          providers: [() => import('../providers/database_provider.js')],
        },
      })
      .withCoreConfig()
      .withCoreProviders()
      .merge({
        config: {
          database: defineConfig({
            connection: 'sqlite',
            connections: {
              sqlite: {
                client: 'sqlite',
                connection: { filename: new URL('./tmp/database.sqlite', import.meta.url).href },
                migrations: { naturalSort: true, paths: ['database/migrations'] },
              },
            },
          }),
        },
      })
      .create(BASE_URL, { importer: IMPORTER })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    const db = await app.container.make('lucid.db')

    await db.from('users').catch(() => {})
    await app.terminate()

    assert.isFalse(db.manager.isConnected('sqlite'))
  })

  test('register testUtils.db() binding', async ({ assert }) => {
    const ignitor = new IgnitorFactory()
      .merge({
        rcFileContents: {
          providers: [() => import('../providers/database_provider.js')],
        },
      })
      .withCoreConfig()
      .withCoreProviders()
      .merge({
        config: {
          database: defineConfig({
            connection: 'sqlite',
            connections: {
              sqlite: {
                client: 'sqlite',
                connection: { filename: new URL('./tmp/database.sqlite', import.meta.url).href },
                migrations: { naturalSort: true, paths: ['database/migrations'] },
              },
            },
          }),
        },
      })
      .create(BASE_URL, { importer: IMPORTER })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    const testUtils = await app.container.make('testUtils')

    assert.isDefined(testUtils.db)
    assert.isFunction(testUtils.db)
  })
})
