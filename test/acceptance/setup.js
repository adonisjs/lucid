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
const ace = require('adonis-ace')
const Ioc = fold.Ioc
const Registrar = fold.Registrar
const path = require('path')
const config = require('../unit/helpers/config')

const Helpers = {
  migrationsPath: function () {
    return path.join(__dirname, './database/migrations')
  },
  seedsPath: function () {
    return path.join(__dirname, './database/seeds')
  },
  databasePath: function (file) {
    return path.join(__dirname, './database', file)
  }
}

const commands = [
  'Adonis/Commands/Migration:Run',
  'Adonis/Commands/Migration:Rollback',
  'Adonis/Commands/DB:Seed',
  'Adonis/Commands/Migration:Status'
]

const providers = [
  path.join(__dirname, '../../providers/DatabaseProvider'),
  path.join(__dirname, '../../providers/FactoryProvider'),
  path.join(__dirname, '../../providers/LucidProvider'),
  path.join(__dirname, '../../providers/MigrationsProvider'),
  path.join(__dirname, '../../providers/SchemaProvider'),
  path.join(__dirname, '../../providers/SeederProvider'),
  path.join(__dirname, '../../providers/CommandsProvider'),
  'adonis-ace/providers/CommandProvider'
]

const setup = exports = module.exports = {}

setup.loadProviders = function () {
  Ioc.bind('Adonis/Src/Helpers', function () {
    return Helpers
  })

  Ioc.bind('Adonis/Src/Config', function () {
    return config
  })
  return Registrar.register(providers)
}

setup.start = function * () {
  yield filesFixtures.createDir()
}

setup.registerCommands = function () {
  ace.register(commands)
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

setup.runCommand = function () {
  return ace.call.apply(ace, arguments)
}
