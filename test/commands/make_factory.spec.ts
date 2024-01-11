/*
 * @adonisjs/assembler
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import MakeFactory from '../../commands/make_factory.js'
import { AceFactory } from '@adonisjs/core/factories'

test.group('Make Factory', async () => {
  test('generate a factory for {model}')
    .with([
      {
        model: 'User',
        factoryDestination: 'user_factory.ts',
        modelImportPath: '#models/user',
      },
      {
        model: 'blog/Post',
        factoryDestination: 'blog/post_factory.ts',
        modelImportPath: '#models/blog/post',
      },
    ])
    .run(async ({ assert, fs }, set) => {
      const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
      await ace.app.init()
      ace.ui.switchMode('raw')

      const command = await ace.create(MakeFactory, [set.model])
      await command.exec()

      command.assertLog(`green(DONE:)    create database/factories/${set.factoryDestination}`)
      await assert.fileContains(
        `database/factories/${set.factoryDestination}`,
        `import ${set.model.split('/').pop()} from '${set.modelImportPath}'`
      )
    })
})
