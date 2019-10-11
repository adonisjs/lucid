/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Lucid/Migrator' {
  import { SchemaConstructorContract } from '@ioc:Adonis/Lucid/Schema'

  export type MigrationNode = {
    absPath: string,
    name: string,
    source: SchemaConstructorContract,
  }

  export interface MigratorContract {
    migrate (): Promise<void>
  }
}
