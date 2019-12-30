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
import { getValue } from '../../../utils'
import { BaseQueryClient } from '../Base/QueryClient'
import { HasOneQueryBuilder } from './QueryBuilder'

/**
 * Query client for executing queries in scope to the defined
 * relationship
 */
export class HasOneQueryClient extends BaseQueryClient implements HasOneClientContract<
ModelConstructorContract,
ModelConstructorContract
> {
  constructor (
    private parent: ModelContract | ModelContract[],
    protected $client: QueryClientContract,
    protected $relation: HasOne,
  ) {
    super($client, $relation)
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
    return getValue(parent, this.$relation.$localKey, this.$relation, action)
  }

  /**
   * Returns instance of query builder
   */
  public query (): any {
    return new HasOneQueryBuilder(this.$client.knexQuery(), this.$client, this.parent, this.$relation)
  }

  /**
   * Returns instance of query builder with `eager=true`
   */
  public eagerQuery (): any {
    return new HasOneQueryBuilder(this.$client.knexQuery(), this.$client, this.parent, this.$relation, true)
  }

  /**
   * Save related model instance
   */
  public async save (related: ModelContract) {
    this.ensureSingleParent(this.parent)
    await this.parent.save()

    /**
     * Do not copy options or trx from the parent model, the end user must do
     * it themselves for explicit behavior
     */
    related[this.$relation.$foreignKey] = this.getForeignKeyValue(this.parent, 'save')
    await related.save()
  }

  /**
   * Create instance of the related model
   */
  public async create (values: ModelObject): Promise<ModelContract> {
    this.ensureSingleParent(this.parent)
    await this.parent.save()

    return this.$relation.$relatedModel().create(Object.assign({
      [this.$relation.$foreignKey]: this.getForeignKeyValue(this.parent, 'create'),
    }, values), this.$clientOptions)
  }

  /**
   * Get the first matching related instance or create a new one
   */
  public async firstOrCreate (
    search: ModelObject,
    savePayload?: ModelObject,
  ): Promise<ModelContract> {
    this.ensureSingleParent(this.parent)
    await this.parent.save()

    return this.$relation.$relatedModel().firstOrCreate(Object.assign({
      [this.$relation.$foreignKey]: this.getForeignKeyValue(this.parent, 'firstOrCreate'),
    }, search), savePayload, this.$clientOptions)
  }

  /**
   * Update the existing row or create a new one
   */
  public async updateOrCreate (
    search: ModelObject,
    updatePayload: ModelObject,
  ): Promise<ModelContract> {
    this.ensureSingleParent(this.parent)
    await this.parent.save()

    return this.$relation.$relatedModel().updateOrCreate(Object.assign({
      [this.$relation.$foreignKey]: this.getForeignKeyValue(this.parent, 'updateOrCreate'),
    }, search), updatePayload, this.$clientOptions)
  }
}
