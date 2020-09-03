/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ClientCreatorContract } from '@ioc:Adonis/Lucid/Database'
import knex from 'knex'
import { resolveClientNameWithAliases } from 'knex/lib/helpers'
import { BaseCreator } from './BaseCreator'
import { PgCreator } from './Pg'
import { MysqlCreator } from './Mysql'
import { MssqlCreator } from './Mssql'

export const creators = {
	mssql: MssqlCreator,
	mysql: MysqlCreator,
	mysql2: MysqlCreator,
	oracledb: BaseCreator,
	postgres: PgCreator,
	redshift: PgCreator,
	sqlite3: BaseCreator,
}

export function getClientCreator(client: string, baseConfig: knex.Config): ClientCreatorContract {
	const name = resolveClientNameWithAliases(client)

	if (creators[name]) {
		return new creators[name](baseConfig)
	}

	return new BaseCreator(baseConfig)
}
