/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { HasOneClientContract } from '@ioc:Adonis/Lucid/Relations'
import { ModelObject, LucidModel, LucidRow } from '@ioc:Adonis/Lucid/Model'

import { HasOne } from './index'
import { HasOneQueryBuilder } from './QueryBuilder'
import { getValue, managedTransaction } from '../../../utils'

/**
 * Query client for executing queries in scope to the defined
 * relationship
 */
export class HasOneQueryClient implements HasOneClientContract<HasOne, LucidModel> {
  constructor (
    public relation: HasOne,
    private parent: LucidRow,
    private client: QueryClientContract,
  ) {
  }

  /**
   * Returns value for the foreign key
   */
  private getForeignKeyValue (parent: LucidRow, action: string) {
    return getValue(parent, this.relation.localKey, this.relation, action)
  }

  /**
   * Returns instance of query builder
   */
  public query (): any {
    return new HasOneQueryBuilder(this.client.knexQuery(), this.client, this.parent, this.relation)
  }

  /**
   * Save related model instance
   */
  public async save (related: LucidRow) {
    await managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await this.parent.save()

      related[this.relation.foreignKey] = this.getForeignKeyValue(this.parent, 'save')
      related.$trx = trx
      await related.save()
    })
  }

  /**
   * Create instance of the related model
   */
  public async create (values: ModelObject): Promise<LucidRow> {
    const parent = this.parent

    return managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await parent.save()

      return this.relation.relatedModel().create(Object.assign({
        [this.relation.foreignKey]: this.getForeignKeyValue(parent, 'create'),
      }, values), { client: trx })
    })
  }

  /**
   * Get the first matching related instance or create a new one
   */
  public async firstOrCreate (
    search: ModelObject,
    savePayload?: ModelObject,
  ): Promise<LucidRow> {
    return managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await this.parent.save()

      return this.relation.relatedModel().firstOrCreate(Object.assign({
        [this.relation.foreignKey]: this.getForeignKeyValue(this.parent, 'firstOrCreate'),
      }, search), savePayload, { client: trx })
    })
  }

  /**
   * Update the existing row or create a new one
   */
  public async updateOrCreate (
    search: ModelObject,
    updatePayload: ModelObject,
  ): Promise<LucidRow> {
    return managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await this.parent.save()

      return this.relation.relatedModel().updateOrCreate(Object.assign({
        [this.relation.foreignKey]: this.getForeignKeyValue(this.parent, 'updateOrCreate'),
      }, search), updatePayload, { client: trx })
    })
  }
}
