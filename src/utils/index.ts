/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import { Exception } from '@poppinss/utils'
import { RelationContract } from '@ioc:Adonis/Lucid/Model'

/**
 * Ensure that relation is defined
 */
export function ensureRelation<T extends RelationContract> (
  name: string,
  relation?: T,
): relation is T {
  if (!relation) {
    throw new Exception(`Cannot process unregistered relationship ${name}`, 500)
  }

  return true
}
