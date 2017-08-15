'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ServiceProvider } = require('@adonisjs/fold')

class MigrationsProvider extends ServiceProvider {
  /**
   * Registering the schema class under
   * Adonis/Src/Schema namespace.
   *
   * @method _registerSchema
   *
   * @return {void}
   *
   * @private
   */
  _registerSchema () {
    this.app.bind('Adonis/Src/Schema', () => require('../src/Schema'))
    this.app.alias('Adonis/Src/Schema', 'Schema')
  }

  /**
   * Registering the factory class under
   * Adonis/Src/Factory namespace.
   *
   * @method _registerFactory
   *
   * @return {void}
   *
   * @private
   */
  _registerFactory () {
    this.app.bind('Adonis/Src/Factory', () => require('../src/Factory'))
    this.app.alias('Adonis/Src/Factory', 'Factory')
  }

  /**
   * Registers providers for all the migration related
   * commands
   *
   * @method _registerCommands
   *
   * @return {void}
   */
  _registerCommands () {
    this.app.bind('Adonis/Commands/Migration:Run', () => require('../commands/MigrationRun'))
    this.app.bind('Adonis/Commands/Migration:Rollback', () => require('../commands/MigrationRollback'))
    this.app.bind('Adonis/Commands/Migration:Refresh', () => require('../commands/MigrationRefresh'))
    this.app.bind('Adonis/Commands/Migration:Reset', () => require('../commands/MigrationReset'))
    this.app.bind('Adonis/Commands/Migration:Status', () => require('../commands/MigrationStatus'))
    this.app.bind('Adonis/Commands/Seed', () => require('../commands/Seed'))
  }

  /**
   * Registering the migration class under
   * Adonis/Src/Migration namespace.
   *
   * @method _registerMigration
   *
   * @return {void}
   *
   * @private
   */
  _registerMigration () {
    this.app.singleton('Adonis/Src/Migration', (app) => {
      const Config = app.use('Adonis/Src/Config')
      const Database = app.use('Adonis/Src/Database')
      const Migration = require('../src/Migration')
      return new Migration(Config, Database)
    })
    this.app.alias('Adonis/Src/Migration', 'Migration')
  }

  /**
   * Register all the required providers
   *
   * @method register
   *
   * @return {void}
   */
  register () {
    this._registerSchema()
    this._registerFactory()
    this._registerMigration()
    this._registerCommands()
  }

  /**
   * On boot add commands with ace
   *
   * @method boot
   *
   * @return {void}
   */
  boot () {
    const ace = require('@adonisjs/ace')
    ace.addCommand('Adonis/Commands/Migration:Run')
    ace.addCommand('Adonis/Commands/Migration:Rollback')
    ace.addCommand('Adonis/Commands/Migration:Refresh')
    ace.addCommand('Adonis/Commands/Migration:Reset')
    ace.addCommand('Adonis/Commands/Migration:Status')
    ace.addCommand('Adonis/Commands/Seed')
  }
}

module.exports = MigrationsProvider
