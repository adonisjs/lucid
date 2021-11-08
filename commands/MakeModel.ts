/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'path'
import { BaseCommand, args, flags } from '@adonisjs/core/build/standalone'

export default class MakeModel extends BaseCommand {
  public static commandName = 'make:model'
  public static description = 'Make a new Lucid model'

  /**
   * The name of the model file.
   */
  @args.string({ description: 'Name of the model class' })
  public name: string

  /**
   * Defines if we generate the migration for the model.
   */
  @flags.boolean({
    name: 'migration',
    alias: 'm',
    description: 'Generate the migration for the model',
  })
  public migration: boolean

  /**
   * Defines if we generate the controller for the model.
   */
  @flags.boolean({
    name: 'controller',
    alias: 'c',
    description: 'Generate the controller for the model',
  })
  public controller: boolean

  /**
   * This command loads the application
   */
  public static settings = {
    loadApp: true,
  }

  /**
   * Execute command
   */
  public async run(): Promise<void> {
    const stub = join(__dirname, '..', 'templates', 'model.txt')

    const path = this.application.resolveNamespaceDirectory('models')

    this.generator
      .addFile(this.name, { pattern: 'pascalcase', form: 'singular' })
      .stub(stub)
      .destinationDir(path || 'app/Models')
      .useMustache()
      .appRoot(this.application.cliCwd || this.application.appRoot)

    if (this.migration) {
      await this.kernel.exec('make:migration', [this.name])
    }

    if (this.controller) {
      await this.kernel.exec('make:controller', [this.name, '--resource'])
    }

    await this.generator.run()
  }
}
