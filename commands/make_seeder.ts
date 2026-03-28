/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import { type CommandOptions } from '@adonisjs/core/types/ace'
import { stubsRoot } from '../stubs/main.js'

export default class MakeSeeder extends BaseCommand {
  static commandName = 'make:seeder'
  static description = 'Make a new Seeder file'

  static options: CommandOptions = {
    allowUnknownFlags: true,
  }

  /**
   * The name of the seeder file.
   */
  @args.string({ description: 'Name of the seeder class' })
  declare name: string

  /**
   * Read the contents from this file (if the flag exists) and use
   * it as the raw contents
   */
  @flags.string({ description: 'Use the contents of the given file as the generated output' })
  declare contentsFrom: string

  /**
   * Forcefully overwrite existing files
   */
  @flags.boolean({ description: 'Forcefully overwrite existing files', alias: 'f' })
  declare force: boolean

  /**
   * Execute command
   */
  async run(): Promise<void> {
    const codemods = await this.createCodemods()
    codemods.overwriteExisting = this.force === true
    await codemods.makeUsingStub(
      stubsRoot,
      'make/seeder/main.stub',
      {
        flags: this.parsed.flags,
        entity: this.app.generators.createEntity(this.name),
      },
      {
        contentsFromFile: this.contentsFrom,
      }
    )
  }
}
