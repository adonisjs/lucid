/*
 * @adonisjs/assembler
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { join } from 'path'
import { Kernel } from '@adonisjs/ace'
import { readJSONSync } from 'fs-extra'
import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/application'
import { replaceFactoryBindings, toNewlineArray } from '../../test-helpers/index'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import MakeFactory from '../../commands/MakeFactory'

const fs = new Filesystem(join(__dirname, '__app'))
const templates = new Filesystem(join(__dirname, '..', '..', 'templates'))

test.group('Make Factory', async (group) => {
  let app: ApplicationContract

  // group.tap((_test) => _test.pin())

  group.each.setup(async () => {
    await fs.add('.adonisrc.json', JSON.stringify({}))
    const rcContents = readJSONSync(join(fs.basePath, '.adonisrc.json'))
    app = new Application(fs.basePath, 'test', rcContents)

    process.env.ADONIS_ACE_CWD = fs.basePath

    return async () => {
      process.env.ADONIS_ACE_CWD = fs.basePath
      await fs.cleanup()
    }
  })

  test('generate a factory for {model}')
    .with([
      {
        argument: 'User',
        model: 'User',
        finalDestination: 'UserFactory.ts',
        finalImportPath: 'App/Models/User',
      },
      {
        argument: 'Blog/Post',
        model: 'Post',
        finalDestination: 'Blog/PostFactory.ts',
        finalImportPath: 'App/Models/Blog/Post',
      },
    ])
    .run(async ({ assert }, set) => {
      const factory = new MakeFactory(app, new Kernel(app).mockConsoleOutput())

      factory.model = set.argument
      await factory.run()

      const UserFactory = await fs.get(`database/factories/${set.finalDestination}`)
      const factoryTemplate = await templates.get('factory.txt')

      assert.deepEqual(
        toNewlineArray(UserFactory),
        replaceFactoryBindings(factoryTemplate, set.model, set.finalImportPath)
      )
    })
    .pin()

  test('generate a factory with custom import path')
    .with([
      {
        argument: 'User',
        model: 'User',
        modelPath: 'Test/User',
        finalDestination: 'UserFactory.ts',
        finalImportPath: 'App/Models/Test/User',
      },
      {
        argument: 'Client',
        model: 'Client',
        modelPath: 'App/Models/Test/B/Client',
        finalDestination: 'ClientFactory.ts',
        finalImportPath: 'App/Models/Test/B/Client',
      },
    ])
    .run(async ({ assert }, set) => {
      const factory = new MakeFactory(app, new Kernel(app).mockConsoleOutput())

      factory.model = set.model
      factory.modelPath = set.modelPath

      await factory.run()

      const UserFactory = await fs.get(`database/factories/${set.finalDestination}`)
      const factoryTemplate = await templates.get('factory.txt')

      assert.deepEqual(
        toNewlineArray(UserFactory),
        replaceFactoryBindings(factoryTemplate, set.model, set.finalImportPath)
      )
    })
    .pin()
})
