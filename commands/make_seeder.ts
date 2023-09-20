/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseCommand, args } from '@adonisjs/core/ace'
import { stubsRoot } from '../stubs/main.js'
import { CommandOptions } from '@adonisjs/core/types/ace'

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
   * Execute command
   */
  async run(): Promise<void> {
    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(stubsRoot, 'make/seeder/main.stub', {
      flags: this.parsed.flags,
      entity: this.app.generators.createEntity(this.name),
    })
  }
}
