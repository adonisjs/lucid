/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { Exception } from '@poppinss/utils'
import { ManyToManyClientContract } from '@ioc:Adonis/Lucid/Relations'
import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import { ModelConstructorContract, ModelContract, ModelObject } from '@ioc:Adonis/Lucid/Model'

import { ManyToMany } from './index'
import { unique, getValue } from '../../../utils'
// import { BaseQueryClient } from '../Base/QueryClient'
import { ManyToManyQueryBuilder } from './QueryBuilder'

/**
 * Query client for executing queries in scope to the defined
 * relationship
 */
export class ManyToManyQueryClient implements ManyToManyClientContract<
ModelConstructorContract,
ModelConstructorContract
> {
  constructor (
    private parent: ModelContract | ModelContract[],
    private client: QueryClientContract,
    private relation: ManyToMany,
  ) {
    // super($client, $relation)
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

  public query (): any {
    return new ManyToManyQueryBuilder(this.client.knexQuery(), this.client, this.parent, this.relation, false, false)
  }

  public eagerQuery (): any {
    return new ManyToManyQueryBuilder(this.client.knexQuery(), this.client, this.parent, this.relation, false, true)
  }

  public pivotQuery (): any {
    return new ManyToManyQueryBuilder(this.client.knexQuery(), this.client, this.parent, this.relation, true, false)
  }

  public async create (): Promise<ModelContract> {
    return {} as Promise<ModelContract>
  }

  public async createMany (): Promise<ModelContract[]> {
    return {} as Promise<ModelContract[]>
  }

  public async save (related: ModelContract, checkExisting: boolean = true) {
    this.ensureSingleParent(this.parent)
    await this.parent.save()

    const trx = await this.client.transaction()

    try {
      related.trx = trx
      await related.save()
      const relatedKeyValue = related[this.relation.relatedKey]

      let hasRow = false
      if (checkExisting) {
        hasRow = await this
          .pivotQuery()
          .wherePivot(this.relation.pivotRelatedForeignKey, relatedKeyValue)
          .useTransaction(trx)
          .first()
      }

      if (!hasRow) {
        await this.attach([relatedKeyValue], trx)
      }

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  public async saveMany (related: ModelContract[], checkExisting: boolean = true) {
    this.ensureSingleParent(this.parent)
    await this.parent.save()

    const trx = await this.client.transaction()

    try {
      await Promise.all(related.map((one) => {
        one.trx = trx
        return one.save()
      }))

      const relatedKeyValues = related.map((one) => one[this.relation.relatedKey])
      let existingsRows: ModelContract[] = []

      if (checkExisting) {
        existingsRows = await this
          .pivotQuery()
          .select(this.relation.pivotRelatedForeignKey)
          .whereInPivot(this.relation.pivotRelatedForeignKey, relatedKeyValues)
          .useTransaction(trx)
      }

      const nonExistingRows = relatedKeyValues.filter((id) => !existingsRows.find((existingRow) => {
        return existingRow.$extras[this.relation.pivotRelatedForeignKey] === id
      }))

      await this.attach(nonExistingRows, trx)
      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Attach one or more related models using it's foreign key value
   * by performing insert inside the pivot table.
   */
  public async attach (
    ids: (string | number)[] | { [key: string]: ModelObject },
    trx?: TransactionClientContract,
  ): Promise<void> {
    this.ensureSingleParent(this.parent)
    const foreignKeyValue = this.getForeignKeyValue(this.parent, 'attach')

    const hasAttributes = !Array.isArray(ids)
    const relatedForeignKeyValues = Array.isArray(ids) ? ids : Object.keys(ids)

    if (relatedForeignKeyValues.length === 0) {
      return
    }

    /**
     * Use existing transaction or create a new one
     */
    let selfTransaction = !trx
    trx = trx || await this.client.transaction()

    /**
     * Perform multi insert
     */
    try {
      await trx
        .insertQuery()
        .table(this.relation.pivotTable)
        .multiInsert(unique(relatedForeignKeyValues).map((id) => {
          return Object.assign({}, hasAttributes ? ids[id] : {}, {
            [this.relation.pivotForeignKey]: foreignKeyValue,
            [this.relation.pivotRelatedForeignKey]: id,
          })
        }))

      if (selfTransaction) {
        await trx.commit()
      }
    } catch (error) {
      if (selfTransaction) {
        await trx.rollback()
      }
      throw error
    }
  }

  public async detach (ids: string[]) {
    await this.pivotQuery().whereInPivot(this.relation.pivotRelatedForeignKey, ids).del()
  }

  public async sync () {
  }
}
