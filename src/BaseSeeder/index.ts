/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'

export class BaseSeeder {
  public static developmentOnly: boolean
  constructor(public client: QueryClientContract) {}

  public async run() {}
}
