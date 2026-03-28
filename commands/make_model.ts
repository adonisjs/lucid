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

export default class MakeModel extends BaseCommand {
  static commandName = 'make:model'
  static description = 'Make a new Lucid model'
  static options: CommandOptions = {
    allowUnknownFlags: true,
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
   * Defines if we generate the transformer for the model.
   */
  @flags.boolean({
    name: 'transformer',
    alias: 'c',
    description: 'Generate the transformer for the model',
  })
  declare transformer: boolean

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
   * Read the contents from this file (if the flag exists) and use
   * it as the raw contents
   */
  @flags.string({ description: 'Use the contents of the given file as the generated output' })
  declare contentsFrom: string

  /**
   * Forcefully overwrite existing files
   */
  @flags.boolean({ description: 'Forcefully overwrite existing files' })
  declare force: boolean

  /**
   * Run migrations
   */
  private async runMakeMigration() {
    if (!this.migration || this.exitCode) {
      return
    }

    const migrationArgs = this.force ? [this.name, '--force'] : [this.name]
    const makeMigration = await this.kernel.exec('make:migration', migrationArgs)
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

    const controllerArgs = this.force ? [this.name, '--force'] : [this.name]
    const makeController = await this.kernel.exec('make:controller', controllerArgs)
    this.exitCode = makeController.exitCode
    this.error = makeController.error
  }

  /**
   * Make transformer
   */
  private async runMakeTransformer() {
    if (!this.transformer || this.exitCode) {
      return
    }

    const transformerArgs = this.force ? [this.name, '--force'] : [this.name]
    const makeTransformer = await this.kernel.exec('make:transformer', transformerArgs)
    this.exitCode = makeTransformer.exitCode
    this.error = makeTransformer.error
  }

  /**
   * Make factory
   */
  private async runMakeFactory() {
    if (!this.factory || this.exitCode) {
      return
    }

    const factoryArgs = this.force ? [this.name, '--force'] : [this.name]
    const makeFactory = await this.kernel.exec('make:factory', factoryArgs)
    this.exitCode = makeFactory.exitCode
    this.error = makeFactory.error
  }

  /**
   * Execute command
   */
  async run(): Promise<void> {
    const codemods = await this.createCodemods()
    codemods.overwriteExisting = this.force === true
    await codemods.makeUsingStub(
      stubsRoot,
      'make/model/main.stub',
      {
        flags: this.parsed.flags,
        entity: this.app.generators.createEntity(this.name),
      },
      {
        contentsFromFile: this.contentsFrom,
      }
    )

    await this.runMakeMigration()
    await this.runMakeTransformer()
    await this.runMakeController()
    await this.runMakeFactory()
  }
}
