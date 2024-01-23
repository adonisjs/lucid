/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { AceFactory } from '@adonisjs/core/factories'
import MakeSeeder from '../../commands/make_seeder.js'

test.group('MakeSeeder', (group) => {
  group.each.teardown(async () => {
    delete process.env.ADONIS_ACE_CWD
  })

  test('make a seeder', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeSeeder, ['user'])
    await command.exec()

    command.assertLog('green(DONE:)    create database/seeders/user_seeder.ts')
    await assert.fileContains(
      'database/seeders/user_seeder.ts',
      `import { BaseSeeder } from '@adonisjs/lucid/seeders'`
    )
    await assert.fileContains(
      'database/seeders/user_seeder.ts',
      `export default class extends BaseSeeder`
    )
  })
})
