/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import 'reflect-metadata'
import { join } from 'path'
import { test } from '@japa/runner'
import { Filesystem } from '@poppinss/dev-utils'
import { Kernel } from '@adonisjs/core/build/standalone'

import MakeModel from '../../commands/MakeModel'
import { toNewlineArray, fs, setupApplication } from '../../test-helpers'

const templatesFs = new Filesystem(join(__dirname, '..', '..', 'templates'))

test.group('MakeModel', (group) => {
  group.each.teardown(async () => {
    delete process.env.ADONIS_ACE_CWD
    await fs.cleanup()
  })

  test('make a model inside the default directory', async ({ assert }) => {
    const app = await setupApplication()

    const kernel = new Kernel(app).mockConsoleOutput()
    kernel.register([MakeModel])
    await kernel.exec('make:model', ['user'])

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

    const kernel = new Kernel(app).mockConsoleOutput()
    kernel.register([MakeModel])
    await kernel.exec('make:model', ['user'])

    const userModel = await fs.get('app/User.ts')
    const schemaTemplate = await templatesFs.get('model.txt')

    assert.deepEqual(
      toNewlineArray(userModel),
      toNewlineArray(schemaTemplate.replace('{{ filename }}', 'User'))
    )
  })
})
