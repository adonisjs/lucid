/*
 * @adonisjs/assembler
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { stubsRoot } from '../stubs/main.js'
import { args, BaseCommand } from '@adonisjs/core/ace'

/**
 * Command to make a new Factory
 */
export default class MakeFactory extends BaseCommand {
  static commandName = 'make:factory'
  static description = 'Make a new factory'

  static options = {
    allowUnknownFlags: true,
  }

  /**
   * Name of the model to be used in the factory
   */
  @args.string({ description: 'Model name for which to create the factory' })
  declare model: string

  async run() {
    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(stubsRoot, 'make/factory/main.stub', {
      flags: this.parsed.flags,
      entity: this.app.generators.createEntity(this.model),
      model: this.app.generators.createEntity(this.model),
    })
  }
}
