/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { fileURLToPath } from 'node:url'
import { IgnitorFactory } from '@adonisjs/core/factories'
import Configure from '@adonisjs/core/commands/configure'

const BASE_URL = new URL('./tmp/', import.meta.url)

test.group('Configure', (group) => {
  group.each.setup(({ context }) => {
    context.fs.baseUrl = BASE_URL
    context.fs.basePath = fileURLToPath(BASE_URL)
  })

  group.each.disableTimeout()

  test('create config file and register provider', async ({ fs, assert }) => {
    const ignitor = new IgnitorFactory()
      .withCoreProviders()
      .withCoreConfig()
      .create(BASE_URL, {
        importer: (filePath) => {
          if (filePath.startsWith('./') || filePath.startsWith('../')) {
            return import(new URL(filePath, BASE_URL).href)
          }

          return import(filePath)
        },
      })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    await fs.create('.env', '')
    await fs.createJson('tsconfig.json', {})
    await fs.create('start/env.ts', `export default Env.create(new URL('./'), {})`)
    await fs.create('adonisrc.ts', `export default defineConfig({})`)

    const ace = await app.container.make('ace')
    ace.prompt.trap('Select the database you want to use').chooseOption(2)
    ace.prompt
      .trap('Do you want to install additional packages required by "@adonisjs/lucid"?')
      .reject()

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('config/database.ts')
    await assert.fileExists('adonisrc.ts')
    await assert.fileContains('adonisrc.ts', '@adonisjs/lucid/commands')
    await assert.fileContains('adonisrc.ts', '@adonisjs/lucid/database_provider')
    await assert.fileContains('config/database.ts', 'defineConfig({')

    await assert.fileContains('.env', 'DB_HOST')
    await assert.fileContains('.env', 'DB_PORT')
    await assert.fileContains('.env', 'DB_USER')
    await assert.fileContains('.env', 'DB_PASSWORD')
    await assert.fileContains('.env', 'DB_DATABASE')

    await assert.fileContains('start/env.ts', `DB_HOST: Env.schema.string({ format: 'host' })`)
    await assert.fileContains('start/env.ts', 'DB_PORT: Env.schema.number()')
    await assert.fileContains('start/env.ts', 'DB_USER: Env.schema.string()')
    await assert.fileContains('start/env.ts', 'DB_PASSWORD: Env.schema.string.optional()')
    await assert.fileContains('start/env.ts', 'DB_DATABASE: Env.schema.string()')
  })

  test('do not define env vars for sqlite dialect', async ({ fs, assert }) => {
    const ignitor = new IgnitorFactory()
      .withCoreProviders()
      .withCoreConfig()
      .create(BASE_URL, {
        importer: (filePath) => {
          if (filePath.startsWith('./') || filePath.startsWith('../')) {
            return import(new URL(filePath, BASE_URL).href)
          }

          return import(filePath)
        },
      })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    await fs.createJson('tsconfig.json', {})
    await fs.create('adonisrc.ts', `export default defineConfig({})`)

    const ace = await app.container.make('ace')
    ace.prompt.trap('Select the database you want to use').chooseOption(0)
    ace.prompt.trap('Do you want to install additional packages required by "@adonisjs/lucid"?')

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('config/database.ts')
    await assert.fileExists('adonisrc.ts')
    await assert.fileContains('adonisrc.ts', '@adonisjs/lucid/database_provider')
    await assert.fileContains('config/database.ts', 'defineConfig({')

    await assert.fileNotExists('.env')
    await assert.fileNotExists('start/env.ts')
  })

  test('create tmp directory for sqlite dialect', async ({ fs, assert }) => {
    const ignitor = new IgnitorFactory()
      .withCoreProviders()
      .withCoreConfig()
      .create(BASE_URL, {
        importer: (filePath) => {
          if (filePath.startsWith('./') || filePath.startsWith('../')) {
            return import(new URL(filePath, BASE_URL).href)
          }

          return import(filePath)
        },
      })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    await fs.createJson('tsconfig.json', {})
    await fs.create('adonisrc.ts', `export default defineConfig({})`)

    const ace = await app.container.make('ace')
    ace.prompt.trap('Select the database you want to use').chooseOption(0)
    ace.prompt.trap('Do you want to install additional packages required by "@adonisjs/lucid"?')

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.dirExists('tmp')
  })

  test('do not recreate tmp directory if it already exists', async ({ fs, assert }) => {
    const ignitor = new IgnitorFactory()
      .withCoreProviders()
      .withCoreConfig()
      .create(BASE_URL, {
        importer: (filePath) => {
          if (filePath.startsWith('./') || filePath.startsWith('../')) {
            return import(new URL(filePath, BASE_URL).href)
          }

          return import(filePath)
        },
      })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    await fs.createJson('tsconfig.json', {})
    await fs.create('adonisrc.ts', `export default defineConfig({})`)
    await fs.create('tmp/db.sqlite', '')

    const ace = await app.container.make('ace')
    ace.prompt.trap('Select the database you want to use').chooseOption(0)
    ace.prompt.trap('Do you want to install additional packages required by "@adonisjs/lucid"?')

    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('tmp/db.sqlite')
  })
})
