/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { Exception } from '@poppinss/utils'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { HasOneClientContract } from '@ioc:Adonis/Lucid/Relations'
import { ModelObject, ModelConstructorContract, ModelContract } from '@ioc:Adonis/Lucid/Model'

import { HasOne } from './index'
import { HasOneQueryBuilder } from './QueryBuilder'
import { getValue, managedTransaction } from '../../../utils'

/**
 * Query client for executing queries in scope to the defined
 * relationship
 */
export class HasOneQueryClient implements HasOneClientContract<
HasOne,
ModelConstructorContract,
ModelConstructorContract
> {
  constructor (
    public relation: HasOne,
    private parent: ModelContract | ModelContract[],
    private client: QueryClientContract,
  ) {
  }

  /**
   * Ensures that persistance is invoked on a single parent instance
   */
  private ensureSingleParent (parent: ModelContract | ModelContract[]): asserts parent is ModelContract {
    if (Array.isArray(parent)) {
      throw new Exception('Cannot save related models with multiple parent instances')
    }
  }

  /**
   * Returns value for the foreign key
   */
  private getForeignKeyValue (parent: ModelContract, action: string) {
    return getValue(parent, this.relation.localKey, this.relation, action)
  }

  /**
   * Returns instance of query builder
   */
  public query (): any {
    return new HasOneQueryBuilder(this.client.knexQuery(), this.client, this.parent, this.relation)
  }

  /**
   * Returns instance of query builder with `eager=true`
   */
  public eagerQuery (): any {
    return new HasOneQueryBuilder(this.client.knexQuery(), this.client, this.parent, this.relation, true)
  }

  /**
   * Save related model instance
   */
  public async save (related: ModelContract) {
    const parent = this.parent
    this.ensureSingleParent(parent)

    await managedTransaction(parent.trx || this.client, async (trx) => {
      parent.trx = trx
      await parent.save()

      related[this.relation.foreignKey] = this.getForeignKeyValue(parent, 'save')
      related.trx = trx
      await related.save()
    })
  }

  /**
   * Create instance of the related model
   */
  public async create (values: ModelObject): Promise<ModelContract> {
    const parent = this.parent
    this.ensureSingleParent(parent)

    return managedTransaction(parent.trx || this.client, async (trx) => {
      parent.trx = trx
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
  ): Promise<ModelContract> {
    const parent = this.parent
    this.ensureSingleParent(parent)

    return managedTransaction(parent.trx || this.client, async (trx) => {
      parent.trx = trx
      await parent.save()

      return this.relation.relatedModel().firstOrCreate(Object.assign({
        [this.relation.foreignKey]: this.getForeignKeyValue(parent, 'firstOrCreate'),
      }, search), savePayload, { client: trx })
    })
  }

  /**
   * Update the existing row or create a new one
   */
  public async updateOrCreate (
    search: ModelObject,
    updatePayload: ModelObject,
  ): Promise<ModelContract> {
    const parent = this.parent
    this.ensureSingleParent(parent)

    return managedTransaction(parent.trx || this.client, async (trx) => {
      parent.trx = trx
      await parent.save()

      return this.relation.relatedModel().updateOrCreate(Object.assign({
        [this.relation.foreignKey]: this.getForeignKeyValue(parent, 'updateOrCreate'),
      }, search), updatePayload, { client: trx })
    })
  }
}
