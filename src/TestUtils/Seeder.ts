/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'

import { SeedsRunner } from '../SeedsRunner'

export class TestsSeeder {
  constructor(
    private Db: DatabaseContract,
    private connectionName: string,
    private application: ApplicationContract
  ) {}

  public async seed() {
    const runner = new SeedsRunner(this.Db, this.application, this.connectionName)
    const seeders = await runner.getList()

    for (let seeder of seeders) {
      runner.run(seeder)
    }
  }
}
