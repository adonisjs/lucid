/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { QueryClientContract } from '../../adonis-typings/database.js'

export class BaseSeeder {
  static environment: string[]
  constructor(public client: QueryClientContract) {}

  async run() {}
}
