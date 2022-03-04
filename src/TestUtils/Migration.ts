/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import type { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { Migrator } from '../Migrator'

/**
 * Migrator class to be used for testing.
 */
export class TestsMigrator {
  constructor(
    private Db: DatabaseContract,
    private connectionName: string,
    private application: ApplicationContract
  ) {}

  private async rollback() {
    const migrator = new Migrator(this.Db, this.application, {
      direction: 'down',
      connectionName: this.connectionName,
      dryRun: false,
    })

    migrator.run()
  }

  public async run() {
    const migrator = new Migrator(this.Db, this.application, {
      direction: 'up',
      connectionName: this.connectionName,
      dryRun: false,
    })

    await migrator.run()
    return () => this.rollback()
  }
}
