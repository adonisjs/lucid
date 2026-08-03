/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type {
  RelationFactory,
  RelationFactoryConfig,
  RelationRegistryContract,
} from '../../types/relations.js'

import * as errors from '../../errors.js'
import { HasOne } from './has_one/index.js'
import { HasMany } from './has_many/index.js'
import { BelongsTo } from './belongs_to/index.js'
import { ManyToMany } from './many_to_many/index.js'
import { HasManyThrough } from './has_many_through/index.js'

/**
 * The relations shipped with Lucid. They are ordinary entries: nothing about them
 * is special-cased anywhere in the ORM.
 */
const BUILT_IN_RELATIONS = [
  ['hasOne', HasOne],
  ['hasMany', HasMany],
  ['belongsTo', BelongsTo],
  ['manyToMany', ManyToMany],
  ['hasManyThrough', HasManyThrough],
] as const

/**
 * Registry of relation types.
 *
 * Registration is monotonic: a type can be added, never removed, replaced or
 * shadowed. That rule holds for built-in and custom relations alike, because they
 * are in the same position -- once a model has been booted, "$relationsDefinitions"
 * holds relation *instances*, so removing the factory would not un-define anything.
 * It would only mean the next module to define that relation blows up.
 *
 * Isolation therefore comes from constructing a new registry, not from mutating a
 * shared one. Every instance starts with the built-ins seeded.
 */
export class RelationRegistry implements RelationRegistryContract {
  #relations = new Map<string, RelationFactory>()

  constructor() {
    for (const [type, Relation] of BUILT_IN_RELATIONS) {
      this.#relations.set(type, {
        type,
        create: (relationName, relatedModel, options, model) =>
          new Relation(relationName, relatedModel, options as any, model),
      } as RelationFactory)
    }
  }

  /**
   * Names of every registered relation type
   */
  get types(): string[] {
    return [...this.#relations.keys()]
  }

  /**
   * Registers a new relation type. Throws when the type is already taken, whether
   * it was taken by Lucid or by another package.
   *
   * @example
   * ```ts
   * BaseModel.$relationRegistry.register('morphTo', {
   *   create(relationName, relatedModel, options, model) {
   *     return new MorphTo(relationName, relatedModel, options, model)
   *   }
   * })
   * ```
   */
  register(type: string, factoryConfig: RelationFactoryConfig): void {
    if (this.#relations.has(type)) {
      throw new errors.E_DUPLICATE_RELATION_TYPE([type])
    }

    this.#relations.set(type, { ...factoryConfig, type })
  }

  /**
   * Retrieves a relation factory by type
   */
  get(type: string): RelationFactory | undefined {
    return this.#relations.get(type)
  }

  /**
   * Checks if a relation type is registered
   */
  has(type: string): boolean {
    return this.#relations.has(type)
  }
}
