'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const fold = require('adonis-fold')
const filesFixtures = require('../unit/fixtures/files')
const Ioc = fold.Ioc
const Registrar = fold.Registrar
const path = require('path')
const config = require('../unit/helpers/config')
Ioc.bind('Adonis/Src/Config', function () {
  return config
})

const providers = [
  path.join(__dirname, '../../providers/DatabaseProvider'),
  path.join(__dirname, '../../providers/FactoryProvider'),
  path.join(__dirname, '../../providers/LucidProvider'),
  path.join(__dirname, '../../providers/MigrationsProvider'),
  path.join(__dirname, '../../providers/SchemaProvider'),
  path.join(__dirname, '../../providers/SeedsProvider')
]

const setup = exports = module.exports = {}

setup.loadProviders = function () {
  return Registrar.register(providers)
}

setup.start = function * () {
  yield filesFixtures.createDir()
}

setup.end = function * () {
}

setup.migrate = function * (schemas, direction) {
  const Migrations = Ioc.use('Adonis/Src/Migrations')
  yield Migrations[direction](schemas)
  if (direction === 'down') {
    yield Migrations.database.schema.dropTable('adonis_migrations')
  }
}

setup.seed = function (seeds) {
  const Seeder = Ioc.use('Adonis/Src/Seeder')
  return Seeder.exec(seeds)
}
