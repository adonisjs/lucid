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
import {
  ModelObject,
  ModelContract,
  ModelConstructorContract,
} from '@ioc:Adonis/Lucid/Model'
import { HasManyClientContract } from '@ioc:Adonis/Lucid/Relations'

import { HasMany } from './index'
import { getValue } from '../../../utils'
import { HasManyQueryBuilder } from './QueryBuilder'

/**
 * Query client for executing queries in scope to the defined
 * relationship
 */
export class HasManyQueryClient implements HasManyClientContract<
ModelConstructorContract,
ModelConstructorContract
> {
  constructor (
    private parent: ModelContract | ModelContract[],
    private client: QueryClientContract,
    private relation: HasMany,
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
    return new HasManyQueryBuilder(
      this.client.knexQuery(),
      this.client,
      this.parent,
      this.relation,
    )
  }

  /**
   * Returns instance of query builder with `eager=true`
   */
  public eagerQuery (): any {
    return new HasManyQueryBuilder(
      this.client.knexQuery(),
      this.client,
      this.parent,
      this.relation,
      true,
    )
  }

  /**
   * Save related model instance
   */
  public async save (related: ModelContract) {
    this.ensureSingleParent(this.parent)
    await this.parent.save()

    related[this.relation.foreignKey] = this.getForeignKeyValue(this.parent, 'save')
    await related.save()
  }

  /**
   * Save related model instance
   */
  public async saveMany (related: ModelContract[]) {
    this.ensureSingleParent(this.parent)
    await this.parent.save()

    const foreignKeyValue = this.getForeignKeyValue(this.parent, 'saveMany')
    const trx = await this.client.transaction()

    try {
      /**
       * Saving many of the related instances by wrapping all of them
       * inside a transaction
       */
      await Promise.all(related.map((row) => {
        row[this.relation.foreignKey] = foreignKeyValue
        row.trx = trx
        return row.save()
      }))

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Create instance of the related model
   */
  public async create (values: ModelObject): Promise<ModelContract> {
    this.ensureSingleParent(this.parent)
    await this.parent.save()

    return this.relation.relatedModel().create(Object.assign({
      [this.relation.foreignKey]: this.getForeignKeyValue(this.parent, 'create'),
    }, values), {
      client: this.client,
      connection: this.client.connectionName,
      profiler: this.client.profiler,
    })
  }

  /**
   * Create instance of the related model
   */
  public async createMany (values: ModelObject[]): Promise<ModelContract[]> {
    this.ensureSingleParent(this.parent)
    await this.parent.save()

    const foreignKeyValue = this.getForeignKeyValue(this.parent, 'saveMany')
    return this.relation.relatedModel().createMany(values.map((value) => {
      return Object.assign({ [this.relation.foreignKey]: foreignKeyValue }, value)
    }), {
      client: this.client,
      connection: this.client.connectionName,
      profiler: this.client.profiler,
    })
  }

  /**
   * Get the first matching related instance or create a new one
   */
  public async firstOrCreate (
    search: any,
    savePayload?: any,
  ): Promise<ModelContract> {
    this.ensureSingleParent(this.parent)
    await this.parent.save()

    return this.relation.relatedModel().firstOrCreate(Object.assign({
      [this.relation.foreignKey]: this.getForeignKeyValue(this.parent, 'firstOrCreate'),
    }, search), savePayload, {
      client: this.client,
      connection: this.client.connectionName,
      profiler: this.client.profiler,
    })
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

    return this.relation.relatedModel().updateOrCreate(Object.assign({
      [this.relation.foreignKey]: this.getForeignKeyValue(this.parent, 'updateOrCreate'),
    }, search), updatePayload, {
      client: this.client,
      connection: this.client.connectionName,
      profiler: this.client.profiler,
    })
  }
}
