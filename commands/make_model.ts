/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import { stubsRoot } from '../stubs/main.js'

export default class MakeModel extends BaseCommand {
  static commandName = 'make:model'
  static description = 'Make a new Lucid model'
  static settings = {
    loadApp: true,
  }

  /**
   * The name of the model file.
   */
  @args.string({ description: 'Name of the model class' })
  declare name: string

  /**
   * Defines if we generate the migration for the model.
   */
  @flags.boolean({
    name: 'migration',
    alias: 'm',
    description: 'Generate the migration for the model',
  })
  declare migration: boolean

  /**
   * Defines if we generate the controller for the model.
   */
  @flags.boolean({
    name: 'controller',
    alias: 'c',
    description: 'Generate the controller for the model',
  })
  declare controller: boolean

  /**
   * Defines if we generate the factory for the model.
   */
  @flags.boolean({
    name: 'factory',
    alias: 'f',
    description: 'Generate a factory for the model',
  })
  declare factory: boolean

  /**
   * Run migrations
   */
  private async runMakeMigration() {
    if (!this.migration || this.exitCode) {
      return
    }

    const makeMigration = await this.kernel.exec('make:migration', [this.name])
    this.exitCode = makeMigration.exitCode
    this.error = makeMigration.error
  }

  /**
   * Make controller
   */
  private async runMakeController() {
    if (!this.controller || this.exitCode) {
      return
    }

    const makeController = await this.kernel.exec('make:controller', [this.name])
    this.exitCode = makeController.exitCode
    this.error = makeController.error
  }

  /**
   * Make factory
   */
  private async runMakeFactory() {
    if (!this.factory || this.exitCode) {
      return
    }

    const makeFactory = await this.kernel.exec('make:factory', [this.name])
    this.exitCode = makeFactory.exitCode
    this.error = makeFactory.error
  }

  /**
   * Execute command
   */
  async run(): Promise<void> {
    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(stubsRoot, 'make/model/main.stub', {
      flags: this.parsed.flags,
      entity: this.app.generators.createEntity(this.name),
    })

    await this.runMakeMigration()
    await this.runMakeController()
    await this.runMakeFactory()
  }
}
