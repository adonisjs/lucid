/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import knex from 'knex'
import { lodash } from '@poppinss/utils'
import { patchKnex } from 'knex-dynamic-connection'
import { ConnectionConfig, ClientCreatorContract } from '@ioc:Adonis/Lucid/Database'

export class BaseCreator implements ClientCreatorContract {
	constructor(private config: knex.Config) {}

	/**
	 * Create patched knex client
	 */
	public createClient(
		config: knex.Config,
		configResolver?: (config: knex.Config) => knex.ConnectionConfig
	): knex {
		const patchedConfig = lodash.merge(
			{ datatypes: { bigint: false } },
			this.config,
			config,
			{ debug: false },
			this.patchConfig(config as ConnectionConfig)
		)

		const client = knex(patchedConfig)

		if (configResolver) {
			patchKnex(client, configResolver)
		}

		this.patchClient(client)

		return client
	}

	protected patchConfig(_: ConnectionConfig): knex.Config {
		return {}
	}

	protected patchClient(_: knex): void {
		//
	}
}
