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
import 'reflect-metadata'
import { join } from 'path'
import { Kernel } from '@adonisjs/ace'
import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/application/build/standalone'
import { toNewlineArray } from '../../test-helpers'

import MakeModel from '../../commands/MakeModel'

const fs = new Filesystem(join(__dirname, '__app'))
const templatesFs = new Filesystem(join(__dirname, '..', '..', 'templates'))

test.group('MakeModel', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('make a model inside the default directory', async (assert) => {
    const app = new Application(fs.basePath, {} as any, {} as any, {})

    const makeModel = new MakeModel(app, new Kernel(app))
    makeModel.name = 'user'
    await makeModel.handle()

    const userModel = await fs.get('app/Models/User.ts')
    const schemaTemplate = await templatesFs.get('model.txt')

    assert.deepEqual(
      toNewlineArray(userModel),
      toNewlineArray(
        schemaTemplate
          .replace(new RegExp('\\${filename}', 'g'), 'User')
      ),
    )
  })

  test('make a model inside a custom directory', async (assert) => {
    const app = new Application(fs.basePath, {} as any, {
      namespaces: {
        models: 'App',
      },
      autoloads: {
        App: './app',
      },
    }, {})

    const makeModel = new MakeModel(app, new Kernel(app))
    makeModel.name = 'user'
    await makeModel.handle()

    const userModel = await fs.get('app/User.ts')
    const schemaTemplate = await templatesFs.get('model.txt')

    assert.deepEqual(
      toNewlineArray(userModel),
      toNewlineArray(
        schemaTemplate
          .replace(new RegExp('\\${filename}', 'g'), 'User')
      ),
    )
  })
})
