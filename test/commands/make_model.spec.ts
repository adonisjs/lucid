/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { ListLoader } from '@adonisjs/core/ace'
import { AceFactory } from '@adonisjs/core/factories'

import { getDb } from '../../test-helpers/index.js'
import MakeModel from '../../commands/make_model.js'
import MakeFactory from '../../commands/make_factory.js'
import MakeMigration from '../../commands/make_migration.js'

test.group('MakeModel', (group) => {
  group.each.teardown(async () => {
    delete process.env.ADONIS_ACE_CWD
  })

  test('make a model', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeModel, ['user'])
    await command.exec()

    command.assertLog('green(DONE:)    create app/models/user.ts')
    await assert.fileContains('app/models/user.ts', 'export default class User extends BaseModel {')
    await assert.fileContains(
      'app/models/user.ts',
      `import { BaseModel, column } from '@adonisjs/lucid/orm'`
    )
  })

  test('make a model with migration', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.app.container.singleton('lucid.db', () => db)
    await ace.app.init()
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([MakeMigration]))

    const command = await ace.create(MakeModel, ['user', '--migration'])
    await command.exec()

    command.assertLog('green(DONE:)    create app/models/user.ts')
    command.assertLogMatches(/database\/migrations\/\d+_create_users_table/)
    await assert.fileContains('app/models/user.ts', 'export default class User extends BaseModel {')
    await assert.fileContains(
      'app/models/user.ts',
      `import { BaseModel, column } from '@adonisjs/lucid/orm'`
    )
  })

  test('make a model with factory', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.app.container.singleton('lucid.db', () => db)
    await ace.app.init()
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([MakeFactory]))

    const command = await ace.create(MakeModel, ['user', '--factory'])
    await command.exec()

    command.assertLog('green(DONE:)    create app/models/user.ts')
    command.assertLog('green(DONE:)    create database/factories/user_factory.ts')
    await assert.fileContains('app/models/user.ts', 'export default class User extends BaseModel {')
    await assert.fileContains(
      'app/models/user.ts',
      `import { BaseModel, column } from '@adonisjs/lucid/orm'`
    )
  })
})
