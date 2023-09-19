/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ModelPaginatorContract, CherryPick } from '../../types/model.js'
import { SimplePaginator } from '../../database/paginator/simple_paginator.js'

/**
 * Model paginator extends the simple paginator and adds support for
 * serializing models as well
 */
export class ModelPaginator extends SimplePaginator implements ModelPaginatorContract<any> {
  /**
   * Serialize models
   */
  serialize(cherryPick?: CherryPick) {
    return {
      meta: this.getMeta(),
      data: this.all().map((row) => row.serialize(cherryPick)),
    }
  }
}
