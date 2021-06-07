/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { flags } from '@adonisjs/core/build/standalone'
import { MigrationListNode } from '@ioc:Adonis/Lucid/Migrator'
import MigrationsBase from './Base'

/**
 * The command is meant to migrate the database by execute migrations
 * in `up` direction.
 */
export default class Status extends MigrationsBase {
  public static commandName = 'migration:status'
  public static description = 'Check migrations current status.'

  /**
   * Define custom connection
   */
  @flags.string({ description: 'Define a custom database connection', alias: 'c' })
  public connection: string

  /**
   * This command loads the application, since we need the runtime
   * to find the migration directories for a given connection
   */
  public static settings = {
    loadApp: true,
  }

  /**
   * Colorizes the status string
   */
  private colorizeStatus(status: MigrationListNode['status']): string {
    switch (status) {
      case 'pending':
        return this.colors.yellow('pending')
      case 'migrated':
        return this.colors.green('completed')
      case 'corrupt':
        return this.colors.red('corrupt')
    }
  }

  /**
   * Handle command
   */
  public async run(): Promise<void> {
    const db = this.application.container.use('Adonis/Lucid/Database')

    this.connection = this.connection || db.primaryConnectionName
    const connection = db.getRawConnection(this.connection)

    /**
     * Ensure the define connection name does exists in the
     * config file
     */
    if (!connection) {
      this.printNotAValidConnection(this.connection)
      this.exitCode = 1
      return
    }

    const Migrator = this.application.container.resolveBinding('Adonis/Lucid/Migrator')
    const migrator = new Migrator(db, this.application, {
      direction: 'up',
      connectionName: this.connection,
    })

    const list = await migrator.getList()
    await migrator.close()

    const table = this.ui.table()
    table.head(['Name', 'Status', 'Batch', 'Message'])

    /**
     * Push a new row to the table
     */
    list.forEach((node) => {
      table.row([
        node.name,
        this.colorizeStatus(node.status),
        node.batch || 'NA',
        node.status === 'corrupt' ? 'The migration file is missing on filesystem' : '',
      ] as any)
    })

    table.render()
  }
}
