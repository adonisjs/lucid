/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'path'
import { BaseCommand, args } from '@adonisjs/ace'

export default class MakeModel extends BaseCommand {
	public static commandName = 'make:model'
	public static description = 'Make a new Lucid model'

	/**
	 * The name of the model file.
	 */
	@args.string({ description: 'Name of the model class' })
	public name: string

	/**
	 * Execute command
	 */
	public async handle(): Promise<void> {
		const stub = join(__dirname, '..', 'templates', 'model.txt')

		const path = this.application.resolveNamespaceDirectory('models')

		this.generator
			.addFile(this.name, { pattern: 'pascalcase', form: 'singular' })
			.stub(stub)
			.destinationDir(path || 'app/Models')
			.useMustache()
			.appRoot(this.application.cliCwd || this.application.appRoot)

		await this.generator.run()
	}
}
