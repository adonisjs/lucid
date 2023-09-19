/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker'
import { FactoryContextContract } from '../../adonis-typings/factory.js'
import { TransactionClientContract } from '../../adonis-typings/database.js'

export class FactoryContext implements FactoryContextContract {
  faker = faker

  constructor(
    public isStubbed: boolean,
    public $trx: TransactionClientContract | undefined
  ) {}
}
