/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Lucid/Seeder' {
	import { QueryClientContract, FileNode } from '@ioc:Adonis/Lucid/Database'

	/**
	 * Shape of seeder class
	 */
	export type SeederConstructorContract = {
		developmentOnly: boolean
		new (client: QueryClientContract): {
			client: QueryClientContract
			run(): Promise<void>
		}
	}

	/**
	 * Shape of file node returned by the run method
	 */
	export type SeederFileNode = {
		status: 'pending' | 'completed' | 'failed' | 'ignored'
		error?: any
		file: FileNode<unknown>
	}

	const BaseSeeder: SeederConstructorContract
	export default BaseSeeder
}
