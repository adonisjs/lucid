/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationService } from '@adonisjs/core/types'

/**
 * Database test utils are meant to be used during testing to
 * perform common tasks like running migrations, seeds, etc.
 */
export class DatabaseTestUtils {
  constructor(
    protected app: ApplicationService,
    protected connectionName?: string
  ) {}

  /**
   * Runs a command through Ace
   */
  async #runCommand(commandName: string, args: string[] = []) {
    if (this.connectionName) {
      args.push(`--connection=${this.connectionName}`)
    }

    const ace = await this.app.container.make('ace')
    const command = await ace.exec(commandName, args)
    if (!command.exitCode) return

    if (command.error) {
      throw command.error
    } else {
      throw new Error(`"${commandName}" failed`)
    }
  }

  /**
   * Testing hook for running migrations ( if needed )
   * Return a function to truncate the whole database but keep the schema
   */
  async truncate() {
    await this.#runCommand('migration:run', ['--compact-output'])
    return () => this.#runCommand('db:truncate')
  }

  /**
   * Testing hook for running seeds
   */
  async seed() {
    await this.#runCommand('db:seed')
  }

  /**
   * Testing hook for running migrations
   * Return a function to rollback the whole database
   *
   * Note that this is slower than truncate() because it
   * has to run all migration in both directions when running tests
   */
  async migrate() {
    await this.#runCommand('migration:run', ['--compact-output'])
    return () => this.#runCommand('migration:rollback', ['--compact-output'])
  }

  /**
   * Testing hook for creating a global transaction
   */
  async withGlobalTransaction() {
    const db = await this.app.container.make('lucid.db')

    await db.beginGlobalTransaction(this.connectionName)
    return () => db.rollbackGlobalTransaction(this.connectionName)
  }
}
