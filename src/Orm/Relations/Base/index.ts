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
import { ModelConstructorContract, ModelContract } from '@ioc:Adonis/Lucid/Model'
import { BaseRelationContract, RelationOptions, TypedRelations } from '@ioc:Adonis/Lucid/Relations'

import { KeysExtractor } from '../KeysExtractor'

export abstract class BaseRelation implements BaseRelationContract<
ModelConstructorContract,
ModelConstructorContract
> {
  public $booted: boolean = false
  public $serializeAs = this.$options.serializeAs || this.$relationName
  public $relatedModel = this.$options.relatedModel

  constructor (
    public $relationName: string,
    protected $options: RelationOptions,
    public $model: ModelConstructorContract,
  ) {
    this.ensureRelatedModel()
  }

  /**
   * Ensure that relationship model is defined as a function
   */
  private ensureRelatedModel () {
    if (typeof (this.$options.relatedModel) !== 'function') {
      throw new Exception(
        `Related model must be returned from a closure on "${this.$model.name}.${this.$relationName}" relation`,
        500,
        'E_MISSING_RELATED_MODEL',
      )
    }
  }

  /**
   * Ensure relationship instance is booted
   */
  protected $ensureIsBooted () {
    if (!this.$booted) {
      throw new Exception(
        'Relationship is not booted. Make sure to call $boot first',
        500,
        'E_RUNTIME_EXCEPTION',
      )
    }
  }

  /**
   * Extract keys for the relationship to work
   */
  protected $extractKeys<
    Keys extends { [key: string]: { key: string, model: ModelConstructorContract } }
  > (
    keys: Keys,
  ): ReturnType<KeysExtractor<Keys>['extract']> {
    return new KeysExtractor(this.$model, this.$relationName, keys).extract()
  }

  public abstract $type: TypedRelations['type']

  /**
   * Returns the query client for the relationship
   */
  public abstract client (
    models: ModelContract | ModelContract[],
    client: QueryClientContract,
  ): any

  public abstract $boot ()
}
