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
    this.app.bind('Adonis/Src/Migration:Run', () => require('../commands/MigrationRun'))
    this.app.bind('Adonis/Src/Migration:Rollback', () => require('../commands/MigrationRollback'))
    this.app.bind('Adonis/Src/Migration:Refresh', () => require('../commands/MigrationRefresh'))
    this.app.bind('Adonis/Src/Migration:Reset', () => require('../commands/MigrationReset'))
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
}

module.exports = MigrationsProvider
