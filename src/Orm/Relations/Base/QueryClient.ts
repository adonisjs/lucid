/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import { RelationBaseQueryClientContract, RelationshipsContract } from '@ioc:Adonis/Lucid/Relations'
import {
  ModelObject,
  ModelConstructorContract,
  ModelContract,
  ModelAdapterOptions,
} from '@ioc:Adonis/Lucid/Model'

/**
 * Query client for executing queries in scope to the defined
 * relationship
 */
export abstract class BaseQueryClient implements RelationBaseQueryClientContract<
ModelConstructorContract,
ModelConstructorContract
> {
  constructor (
    protected $client: QueryClientContract,
    protected $relation: RelationshipsContract,
  ) {
  }

  /**
   * Client options to be used when persisting related
   * models.
   */
  protected $clientOptions: ModelAdapterOptions = {
    client: this.$client,
    connection: this.$client.connectionName,
    profiler: this.$client.profiler,
  }

  /**
   * Perisist a model instance
   */
  protected async $persist (
    related: ModelContract,
    trx?: TransactionClientContract,
  ) {
    if (!trx) {
      related.$setOptionsAndTrx(this.$clientOptions)
      await related.save()
    }

    related.$trx = trx
    await related.save()
  }

  /**
   * Creates a persists a single model instance
   */
  protected async $createAndPersist (
    values: ModelObject,
    trx?: TransactionClientContract,
  ): Promise<ModelContract> {
    if (!trx) {
      return this.$relation.$relatedModel().create(values, this.$clientOptions)
    }
    return this.$relation.$relatedModel().create(values, { client: trx })
  }

  /**
   * Creates a persists many of the model instances
   */
  protected async $createAndPersistMany (values: ModelObject[]): Promise<ModelContract[]> {
    return this.$relation.$relatedModel().createMany(values, this.$clientOptions)
  }

  /**
   * Returns instance of query builder
   */
  public abstract query (): any

  /**
   * Returns instance of query builder with `eager=true`
   */
  public abstract eagerQuery (): any
}

