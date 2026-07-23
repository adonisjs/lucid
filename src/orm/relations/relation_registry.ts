/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { RelationFactory, RelationFactoryConfig } from '../../types/relations.js'

/**
 * Registry for managing custom relation types.
 * Allows third-party packages to register new relation types.
 */
export class RelationRegistry {
  private static relations = new Map<string, RelationFactory>()

  /**
   * Registers a new relation type
   *
   * @example
   * ```ts
   * RelationRegistry.register('myRelation', {
   *   create(relationName, relatedModel, options, model) {
   *     return new MyRelation(relationName, relatedModel, options, model)
   *   }
   * })
   * ```
   */
  static register(type: string, factoryConfig: RelationFactoryConfig): void {
    if (this.relations.has(type)) {
      throw new Error(`Relation type "${type}" is already registered`)
    }

    // Inject the type into the factory config
    const factory: RelationFactory = {
      ...factoryConfig,
      type,
    }

    this.relations.set(type, factory)
  }

  /**
   * Retrieves a relation factory by type
   */
  static get(type: string): RelationFactory | undefined {
    return this.relations.get(type)
  }

  /**
   * Checks if a relation type is registered
   */
  static has(type: string): boolean {
    return this.relations.has(type)
  }

  /**
   * Unregisters a relation type (mainly for testing)
   */
  static unregister(type: string): void {
    this.relations.delete(type)
  }

  /**
   * Clears all registered relations (mainly for testing)
   */
  static clear(): void {
    this.relations.clear()
  }
}
