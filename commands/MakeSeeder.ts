/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'path'
import { BaseCommand, args } from '@adonisjs/core/build/standalone'

export default class MakeSeeder extends BaseCommand {
  public static commandName = 'make:seeder'
  public static description = 'Make a new Seeder file'

  /**
   * The name of the seeder file.
   */
  @args.string({ description: 'Name of the seeder class' })
  public name: string

  /**
   * Execute command
   */
  public async run(): Promise<void> {
    const stub = join(__dirname, '..', 'templates', 'seeder.txt')

    const path = this.application.rcFile.directories.seeds

    this.generator
      .addFile(this.name, { pattern: 'pascalcase', form: 'singular' })
      .stub(stub)
      .destinationDir(path || 'database/Seeders')
      .useMustache()
      .appRoot(this.application.cliCwd || this.application.appRoot)

    await this.generator.run()
  }
}
