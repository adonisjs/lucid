/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import app from '@adonisjs/core/services/app'
import { Database } from '../src/database/main.js'

let db: Database

/**
 * Returns a singleton instance of the Database class from the
 * container
 */
await app.booted(async () => {
  db = await app.container.make(Database)
})

export { db as default }
