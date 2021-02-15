/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Core/Application' {
  import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
  import { FactoryManagerContract } from '@ioc:Adonis/Lucid/Factory'
  import * as Orm from '@ioc:Adonis/Lucid/Orm'
  import { SchemaConstructorContract } from '@ioc:Adonis/Lucid/Schema'
  import { SeederConstructorContract } from '@ioc:Adonis/Lucid/Seeder'

  export interface ContainerBindings {
    'Adonis/Lucid/Database': DatabaseContract
    'Adonis/Lucid/Factory': FactoryManagerContract
    'Adonis/Lucid/Orm': typeof Orm
    'Adonis/Lucid/Schema': SchemaConstructorContract
    'Adonis/Lucid/Seeder': SeederConstructorContract
  }
}
