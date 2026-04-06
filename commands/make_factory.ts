/*
 * @adonisjs/assembler
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type CommandOptions } from '@adonisjs/core/types/ace'
import { stubsRoot } from '../stubs/main.js'
import { args, BaseCommand, flags } from '@adonisjs/core/ace'

/**
 * Command to make a new Factory
 */
export default class MakeFactory extends BaseCommand {
  static commandName = 'make:factory'
  static description = 'Make a new factory'

  static options: CommandOptions = {
    allowUnknownFlags: true,
  }

  /**
   * Name of the model to be used in the factory
   */
  @args.string({ description: 'Model name for which to create the factory' })
  declare model: string

  /**
   * Read the contents from this file (if the flag exists) and use
   * it as the raw contents
   */
  @flags.string({ description: 'Use the contents of the given file as the generated output' })
  declare contentsFrom: string

  async run() {
    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(
      stubsRoot,
      'make/factory/main.stub',
      {
        flags: this.parsed.flags,
        entity: this.app.generators.createEntity(this.model),
        model: this.app.generators.createEntity(this.model),
      },
      {
        contentsFromFile: this.contentsFrom,
      }
    )
  }
}
