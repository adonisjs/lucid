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
import { Pool } from 'tarn'
import { EventEmitter } from 'events'
import { Exception } from '@poppinss/utils'
import { patchKnex } from 'knex-dynamic-connection'
import { LoggerContract } from '@ioc:Adonis/Core/Logger'
import { ConnectionConfig, ConnectionContract, ReportNode } from '@ioc:Adonis/Lucid/Database'

import { Logger } from './Logger'

/**
 * Connection class manages a given database connection. Internally it uses
 * knex to build the database connection with appropriate database
 * driver.
 */
export class Connection extends EventEmitter implements ConnectionContract {
	/**
	 * Reference to knex. The instance is created once the `open`
	 * method is invoked
	 */
	public client?: knex

	/**
	 * Read client when read/write replicas are defined in the config, otherwise
	 * it is a reference to the `client`.
	 */
	public readClient?: knex

	/**
	 * A boolean to know if connection operates on read/write
	 * replicas
	 */
	public hasReadWriteReplicas: boolean = !!(
		this.config.replicas &&
		this.config.replicas.read &&
		this.config.replicas.write
	)

	/**
	 * Config for one or more read replicas. Only exists, when replicas are
	 * defined
	 */
	private readReplicas: any[] = []

	/**
	 * The round robin counter for reading config
	 */
	private roundRobinCounter = 0

	constructor(
		public readonly name: string,
		public config: ConnectionConfig,
		private logger: LoggerContract
	) {
		super()
		this.validateConfig()
	}

	/**
	 * Validates the config to ensure that read/write replicas are defined
	 * properly.
	 */
	private validateConfig(): void {
		if (this.config.replicas) {
			if (!this.config.replicas.read || !this.config.replicas.write) {
				throw new Exception(
					'Make sure to define read/write replicas or use connection property',
					500,
					'E_INCOMPLETE_REPLICAS_CONFIG'
				)
			}

			if (!this.config.replicas.read.connection || !this.config.replicas.read.connection) {
				throw new Exception(
					'Make sure to define connection property inside read/write replicas',
					500,
					'E_INVALID_REPLICAS_CONFIG'
				)
			}
		}
	}

	/**
	 * Cleanup references
	 */
	private cleanup(): void {
		this.client = undefined
		this.readClient = undefined
		this.readReplicas = []
		this.roundRobinCounter = 0
	}

	/**
	 * Does cleanup by removing knex reference and removing all listeners.
	 * For the same of simplicity, we get rid of both read and write
	 * clients, when anyone of them disconnects.
	 */
	private monitorPoolResources(): void {
		/**
		 * Pool has destroyed and hence we must cleanup resources
		 * as well.
		 */
		this.pool!.on('poolDestroySuccess', () => {
			this.logger.trace({ connection: this.name }, 'pool destroyed, cleaning up resource')
			this.cleanup()
			this.emit('disconnect', this)
			this.removeAllListeners()
		})

		if (this.readPool !== this.pool) {
			this.readPool!.on('poolDestroySuccess', () => {
				this.logger.trace({ connection: this.name }, 'pool destroyed, cleaning up resource')
				this.cleanup()
				this.emit('disconnect', this)
				this.removeAllListeners()
			})
		}
	}

	/**
	 * Returns normalized config object for write replica to be
	 * used by knex
	 */
	private getWriteConfig(): knex.Config {
		if (!this.config.replicas) {
			return this.config
		}

		const { replicas, ...config } = this.config

		/**
		 * Give preference to the replica write connection when and merge values from
		 * the main connection object when defined.
		 */
		if (typeof replicas.write.connection === 'string' || typeof config.connection === 'string') {
			config.connection = replicas.write.connection
		} else {
			config.connection = Object.assign({}, config.connection, replicas.write.connection)
		}

		/**
		 * Add pool to the config when pool config defined on main connection
		 * or the write replica
		 */
		if (config.pool || replicas.write.pool) {
			config.pool = Object.assign({}, config.pool, replicas.write.pool)
		}

		return config as knex.Config
	}

	/**
	 * Returns the config for read replicas.
	 */
	private getReadConfig(): knex.Config {
		if (!this.config.replicas) {
			return this.config
		}

		const { replicas, ...config } = this.config

		/**
		 * Reading replicas and storing them as a reference, so that we
		 * can pick a config from replicas as round robin.
		 */
		this.readReplicas = (replicas.read.connection as Array<any>).map((one) => {
			if (typeof one === 'string' || typeof config.connection === 'string') {
				return one
			} else {
				return Object.assign({}, config.connection, one)
			}
		})

		/**
		 * Add database property on the main connection, since knexjs needs it
		 * internally
		 */
		config.connection = {
			database: this.readReplicas[0].database,
		}

		/**
		 * Add pool to the config when pool config defined on main connection
		 * or the read replica
		 */
		if (config.pool || replicas.read.pool) {
			config.pool = Object.assign({}, config.pool, replicas.read.pool)
		}

		return config as knex.Config
	}

	/**
	 * Resolves connection config for the writer connection
	 */
	private writeConfigResolver(originalConfig: ConnectionConfig) {
		return originalConfig.connection
	}

	/**
	 * Resolves connection config for the reader connection
	 */
	private readConfigResolver(originalConfig: ConnectionConfig) {
		if (!this.readReplicas.length) {
			return originalConfig.connection
		}

		const index = this.roundRobinCounter++ % this.readReplicas.length
		this.logger.trace({ connection: this.name }, `round robin using host at ${index} index`)
		return this.readReplicas[index]
	}

	/**
	 * Creates the write connection.
	 */
	private setupWriteConnection() {
		this.client = knex(
			Object.assign({ log: new Logger(this.name, this.logger) }, this.getWriteConfig(), {
				debug: false,
			})
		)
		patchKnex(this.client, this.writeConfigResolver.bind(this))
	}

	/**
	 * Creates the read connection. If there aren't any replicas in use, then
	 * it will use the write client instead.
	 */
	private setupReadConnection() {
		if (!this.hasReadWriteReplicas) {
			this.readClient = this.client
			return
		}

		this.logger.trace({ connection: this.name }, 'setting up read/write replicas')
		this.readClient = knex(
			Object.assign({ log: new Logger(this.name, this.logger) }, this.getReadConfig(), {
				debug: false,
			})
		)
		patchKnex(this.readClient, this.readConfigResolver.bind(this))
	}

	/**
	 * Checks all the read hosts by running a query on them. Stops
	 * after first error.
	 */
	private async checkReadHosts() {
		const configCopy = Object.assign({ log: new Logger(this.name, this.logger) }, this.config, {
			debug: false,
		})
		let error: any = null

		// eslint-disable-next-line @typescript-eslint/naming-convention
		for (let _ of this.readReplicas) {
			configCopy.connection = this.readConfigResolver(this.config)
			this.logger.trace({ connection: this.name }, 'spawing health check read connection')
			const client = knex(configCopy)

			try {
				await client.raw('SELECT 1 + 1 AS result')
			} catch (err) {
				error = err
			}

			/**
			 * Cleanup client connection
			 */
			await client.destroy()
			this.logger.trace({ connection: this.name }, 'destroying health check read connection')

			/**
			 * Return early when there is an error
			 */
			if (error) {
				break
			}
		}

		return error
	}

	/**
	 * Checks for the write host
	 */
	private async checkWriteHost() {
		try {
			await this.client!.raw('SELECT 1 + 1 AS result')
		} catch (error) {
			return error
		}
	}

	/**
	 * Returns the pool instance for the given connection
	 */
	public get pool(): null | Pool<any> {
		return this.client ? this.client.client.pool : null
	}

	/**
	 * Returns the pool instance for the read connection. When replicas are
	 * not in use, then read/write pools are same.
	 */
	public get readPool(): null | Pool<any> {
		return this.readClient ? this.readClient.client.pool : null
	}

	/**
	 * Returns a boolean indicating if the connection is ready for making
	 * database queries. If not, one must call `connect`.
	 */
	public get ready(): boolean {
		return !!(this.client || this.readClient)
	}

	/**
	 * Opens the connection by creating knex instance
	 */
	public connect() {
		try {
			this.setupWriteConnection()
			this.setupReadConnection()
			this.monitorPoolResources()
			this.emit('connect', this)
		} catch (error) {
			this.emit('error', error, this)
			throw error
		}
	}

	/**
	 * Closes DB connection by destroying knex instance. The `connection`
	 * object must be free for garbage collection.
	 *
	 * In case of error this method will emit `close:error` event followed
	 * by the `close` event.
	 */
	public async disconnect(): Promise<void> {
		this.logger.trace({ connection: this.name }, 'destroying connection')

		/**
		 * Disconnect write client
		 */
		if (this.client) {
			try {
				await this.client.destroy()
			} catch (error) {
				this.emit('disconnect:error', error, this)
			}
		}

		/**
		 * Disconnect read client when it exists and both clients
		 * aren't same
		 */
		if (this.readClient && this.readClient !== this.client) {
			try {
				await this.readClient.destroy()
			} catch (error) {
				this.emit('disconnect:error', error, this)
			}
		}
	}

	/**
	 * Returns the healthcheck report for the connection
	 */
	public async getReport(): Promise<ReportNode> {
		const error = await this.checkWriteHost()
		let readError: Error | undefined

		if (!error && this.hasReadWriteReplicas) {
			readError = await this.checkReadHosts()
		}

		return {
			connection: this.name,
			message: readError
				? 'Unable to reach one of the read hosts'
				: error
				? 'Unable to reach the database server'
				: 'Connection is healthy',
			error: error || readError || null,
		}
	}
}
