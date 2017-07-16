'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const path = require('path')
const helpers = require('../unit/helpers')
const { ioc, registrar } = require('@adonisjs/fold')
const { Config } = require('@adonisjs/sink')
const test = require('japa')

test.group('Providers', (group) => {
  group.before(() => {
    ioc.bind('Adonis/Src/Config', () => {
      const config = new Config()
      config.set('database', {
        connection: 'testing',
        testing: helpers.getConfig()
      })
      return config
    })
  })

  test('register lucid provider and access query builder', async (assert) => {
    await registrar
      .providers([path.join(__dirname, '../../providers/LucidProvider')])
      .registerAndBoot()

    assert.isDefined(ioc.use('Adonis/Src/Database'))
    assert.isTrue(ioc._bindings['Adonis/Src/Database'].singleton)

    assert.isDefined(ioc.use('Adonis/Src/Model'))
    assert.isFalse(ioc._bindings['Adonis/Src/Model'].singleton)

    assert.isDefined(ioc.use('Database'))
    assert.isDefined(ioc.use('Model'))
  })

  test('register migrations provider', async (assert) => {
    await registrar
      .providers([path.join(__dirname, '../../providers/MigrationsProvider')])
      .registerAndBoot()

    assert.isDefined(ioc.use('Adonis/Src/Schema'))
    assert.isFalse(ioc._bindings['Adonis/Src/Schema'].singleton)

    assert.isDefined(ioc.use('Adonis/Src/Factory'))
    assert.isFalse(ioc._bindings['Adonis/Src/Factory'].singleton)

    assert.isDefined(ioc.use('Adonis/Src/Migration'))
    assert.isTrue(ioc._bindings['Adonis/Src/Migration'].singleton)
  })
})
