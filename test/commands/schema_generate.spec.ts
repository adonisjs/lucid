/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import 'reflect-metadata'
import { test } from '@japa/runner'
import { AceFactory } from '@adonisjs/core/factories'

import SchemaGenerate from '../../commands/schema_generate.js'
import { setup, cleanup, getDb } from '../../test-helpers/index.js'

test.group('schema:generate', (group) => {
  group.each.setup(async () => {
    await setup()
    return async () => {
      await cleanup()
      await cleanup(['adonis_schema', 'adonis_schema_versions', 'schema_users'])
    }
  })

  test('generate schema classes for database tables', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    await db.connection().schema.createTable('schema_users', (table) => {
      table.increments('id')
      table.string('email')
      table.timestamps()
    })

    const generate = await ace.create(SchemaGenerate, [])
    await generate.exec()

    const schemaFileExists = await fs.exists('database/schema.ts')
    assert.isTrue(schemaFileExists)
    assert.equal(generate.exitCode, 0)
    generate.assertLogMatches(/Scanned table schema_users/)
  })

  test('generate schema with compact output should display one line', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    await db.connection().schema.createTable('schema_users', (table) => {
      table.increments('id')
    })

    const generate = await ace.create(SchemaGenerate, ['--compact-output'])
    await generate.exec()

    assert.equal(generate.exitCode, 0)
    generate.assertLogMatches(/Schema classes generated/)
  })
})
