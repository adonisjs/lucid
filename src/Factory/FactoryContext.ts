/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker'
import { FactoryContextContract } from '@ioc:Adonis/Lucid/Factory'
import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'

export class FactoryContext implements FactoryContextContract {
  public faker = faker

  constructor(public isStubbed: boolean, public $trx: TransactionClientContract | undefined) {}
}
