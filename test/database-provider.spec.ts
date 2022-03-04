/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { Database } from '../src/Database'
import { scope } from '../src/Helpers/scope'
import { BaseSeeder } from '../src/BaseSeeder'
import { FactoryManager } from '../src/Factory'
import { BaseModel } from '../src/Orm/BaseModel'
import { ModelPaginator } from '../src/Orm/Paginator'
import * as decorators from '../src/Orm/Decorators'
import { SnakeCaseNamingStrategy } from '../src/Orm/NamingStrategies/SnakeCase'

import { setupApplication, fs } from '../test-helpers'

test.group('Database Provider', (group) => {
  group.each.teardown(async () => {
    await fs.cleanup()
  })

  test('register database provider', async ({ assert }) => {
    const app = await setupApplication(
      {
        connection: 'sqlite',
        connections: {
          sqlite: {},
        },
      },
      ['../../providers/DatabaseProvider']
    )

    assert.instanceOf(app.container.use('Adonis/Lucid/Database'), Database)
    assert.deepEqual(app.container.use('Adonis/Lucid/Orm'), {
      BaseModel,
      ModelPaginator,
      SnakeCaseNamingStrategy,
      scope,
      ...decorators,
    })
    assert.isTrue(app.container.hasBinding('Adonis/Lucid/Schema'))
    assert.instanceOf(app.container.use('Adonis/Lucid/Factory'), FactoryManager)
    assert.deepEqual(app.container.use('Adonis/Lucid/Seeder'), BaseSeeder)
  })

  test('register health checker', async ({ assert }) => {
    const app = await setupApplication(
      {
        connection: 'sqlite',
        connections: {
          sqlite: {
            healthCheck: true,
          },
        },
      },
      ['../../providers/DatabaseProvider']
    )

    const HealthCheck = app.container.use('Adonis/Core/HealthCheck')
    assert.equal(HealthCheck['healthCheckers']['lucid'], 'Adonis/Lucid/Database')
  })

  test('register validator rules', async ({ assert }) => {
    const app = await setupApplication(
      {
        connection: 'sqlite',
        connections: {
          sqlite: {},
        },
      },
      ['../../providers/DatabaseProvider']
    )

    const Validator = app.container.use('Adonis/Core/Validator')
    assert.property(Validator['rules'], 'unique')
    assert.property(Validator['rules'], 'exists')
  })

  test('register repl bindings in repl environment', async ({ assert }) => {
    const app = await setupApplication(
      {
        connection: 'sqlite',
        connections: {
          sqlite: {},
        },
      },
      ['../../providers/DatabaseProvider'],
      'repl'
    )

    const Repl = app.container.use('Adonis/Addons/Repl')
    assert.property(Repl['customMethods'], 'loadModels')
    assert.property(Repl['customMethods'], 'loadDb')
  })

  test('register test utils', async ({ assert }) => {
    const app = await setupApplication(
      {
        connection: 'sqlite',
        connections: {
          sqlite: {
            healthCheck: true,
          },
        },
      },
      ['../../providers/DatabaseProvider']
    )

    const TestUtils = app.container.use('Adonis/Core/TestUtils')
    assert.properties(TestUtils.db, ['seed', 'migrate'])
  }).skip(true)
})
