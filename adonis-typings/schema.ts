/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { QueryClientContract } from './database.js'

/**
 * Shape of callback to defer database calls
 */
export type DeferCallback = (client: QueryClientContract) => void | Promise<void>
