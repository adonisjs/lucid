/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { test } from '@japa/runner'
import 'reflect-metadata'
import { join } from 'path'
import { Kernel } from '@adonisjs/core/build/standalone'
import { Filesystem } from '@poppinss/dev-utils'
import { toNewlineArray, fs, setupApplication } from '../../test-helpers'

import MakeModel from '../../commands/MakeModel'

const templatesFs = new Filesystem(join(__dirname, '..', '..', 'templates'))

test.group('MakeModel', (group) => {
  group.each.teardown(async () => {
    delete process.env.ADONIS_ACE_CWD
    await fs.cleanup()
  })

  test('make a model inside the default directory', async ({ assert }) => {
    const app = await setupApplication()

    const makeModel = new MakeModel(app, new Kernel(app))
    makeModel.name = 'user'
    await makeModel.run()

    const userModel = await fs.get('app/Models/User.ts')
    const schemaTemplate = await templatesFs.get('model.txt')

    assert.deepEqual(
      toNewlineArray(userModel),
      toNewlineArray(schemaTemplate.replace('{{ filename }}', 'User'))
    )
  })

  test('make a model inside a custom directory', async ({ assert }) => {
    const app = await setupApplication()
    app.rcFile.namespaces.models = 'App'

    const makeModel = new MakeModel(app, new Kernel(app))
    makeModel.name = 'user'
    await makeModel.run()

    const userModel = await fs.get('app/User.ts')
    const schemaTemplate = await templatesFs.get('model.txt')

    assert.deepEqual(
      toNewlineArray(userModel),
      toNewlineArray(schemaTemplate.replace('{{ filename }}', 'User'))
    )
  })
})
