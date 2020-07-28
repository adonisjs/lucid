/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Lucid/Seeder' {
	import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'

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
		absPath: string
		name: string
		source: SeederConstructorContract
		status: 'pending' | 'completed' | 'failed' | 'ignored'
		error?: any
	}

	const BaseSeeder: SeederConstructorContract
	export default BaseSeeder
}
