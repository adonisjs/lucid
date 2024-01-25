/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Kernel } from '@adonisjs/core/ace'

import type { Database } from '../database/main.js'

/**
 * Database test utils are meant to be used during testing to
 * perform common tasks like running migrations, seeds, etc.
 */
export class DatabaseTestUtils {
  constructor(
    protected kernel: Kernel,
    protected db: Database,
    protected connectionName?: string
  ) {}

  /**
   * Runs a command through Ace
   */
  async #runCommand(commandName: string, args: string[] = []) {
    if (this.connectionName) {
      args.push(`--connection=${this.connectionName}`)
    }

    const command = await this.kernel.exec(commandName, args)
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
    await this.db.beginGlobalTransaction(this.connectionName)
    return () => this.db.rollbackGlobalTransaction(this.connectionName)
  }
}
