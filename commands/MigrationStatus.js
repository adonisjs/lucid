'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const BaseMigration = require('./BaseMigration')

class MigrationStatus extends BaseMigration {
  /**
   * Command signature required by ace
   *
   * @method signature
   *
   * @return {String}
   */
  static get signature () {
    return 'migration:status'
  }

  /**
   * Command description
   *
   * @method description
   *
   * @return {String}
   */
  static get description () {
    return 'Check migrations current status'
  }

  /**
   * Method called when command is executed. This method
   * will print a table with the migrations status.
   *
   * @method handle
   *
   * @return {void|Array}
   */
  async handle () {
    try {
      const migrations = await this.migration.status(this._getSchemaFiles())
      const head = ['File name', 'Migrated', 'Batch']
      const body = migrations.map((migration) => {
        return [migration.name, migration.migrated ? 'Yes' : 'No', migration.batch || '']
      })
      this.table(head, body)
    } catch (error) {
      console.log(error)
    }
  }
}

module.exports = MigrationStatus
