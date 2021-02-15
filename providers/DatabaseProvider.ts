/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationContract } from '@ioc:Adonis/Core/Application'

/**
 * Database service provider
 */
export default class DatabaseServiceProvider {
	constructor(protected app: ApplicationContract) {}
	public static needsApplication = true

	/**
	 * Register the database binding
	 */
	private registerDatabase() {
		this.app.container.singleton('Adonis/Lucid/Database', () => {
			const config = this.app.container.resolveBinding('Adonis/Core/Config').get('database', {})
			const Logger = this.app.container.resolveBinding('Adonis/Core/Logger')
			const Profiler = this.app.container.resolveBinding('Adonis/Core/Profiler')
			const Emitter = this.app.container.resolveBinding('Adonis/Core/Event')

			const { Database } = require('../src/Database')
			return new Database(config, Logger, Profiler, Emitter)
		})
	}

	/**
	 * Registers ORM
	 */
	private registerOrm() {
		this.app.container.singleton('Adonis/Lucid/Orm', () => {
			const Config = this.app.container.resolveBinding('Adonis/Core/Config')

			const { Adapter } = require('../src/Orm/Adapter')
			const { scope } = require('../src/Helpers/scope')
			const decorators = require('../src/Orm/Decorators')
			const { BaseModel } = require('../src/Orm/BaseModel')
			const ormConfig = require('../src/Orm/Config').Config

			/**
			 * Attaching adapter to the base model. Each model is allowed to define
			 * a different adapter.
			 */
			BaseModel.$adapter = new Adapter(this.app.container.resolveBinding('Adonis/Lucid/Database'))
			BaseModel.$container = this.app.container
			BaseModel.$configurator = Object.assign({}, ormConfig, Config.get('database.orm', {}))

			return {
				BaseModel,
				scope,
				...decorators,
			}
		})
	}

	/**
	 * Registers schema class
	 */
	private registerSchema() {
		this.app.container.singleton('Adonis/Lucid/Schema', () => {
			const { Schema } = require('../src/Schema')
			return Schema
		})
	}

	/**
	 * Registers schema class
	 */
	private registerFactory() {
		this.app.container.singleton('Adonis/Lucid/Factory', () => {
			const { FactoryManager } = require('../src/Factory')
			return new FactoryManager()
		})
	}

	/**
	 * Registers schema class
	 */
	private registerBaseSeeder() {
		this.app.container.singleton('Adonis/Lucid/Seeder', () => {
			const { BaseSeeder } = require('../src/BaseSeeder')
			return BaseSeeder
		})
	}

	/**
	 * Registers the health checker
	 */
	private registerHealthChecker() {
		/**
		 * Do not register health checks in the repl environment
		 */
		if (this.app.environment === 'repl') {
			return
		}

		this.app.container.with(
			['Adonis/Core/HealthCheck', 'Adonis/Lucid/Database'],
			(HealthCheck, Db) => {
				if (Db.hasHealthChecksEnabled) {
					HealthCheck.addChecker('lucid', 'Adonis/Lucid/Database')
				}
			}
		)
	}

	/**
	 * Extends the validator by defining validation rules
	 */
	private defineValidationRules() {
		/**
		 * Do not register validation rules in the "repl" environment
		 */
		if (this.app.environment === 'repl') {
			return
		}

		this.app.container.with(['Adonis/Core/Validator', 'Adonis/Lucid/Database'], (Validator, Db) => {
			const { extendValidator } = require('../src/Bindings/Validator')
			extendValidator(Validator.validator, Db)
		})
	}

	/**
	 * Defines REPL bindings
	 */
	private defineReplBindings() {
		if (this.app.environment !== 'repl') {
			return
		}

		this.app.container.withBindings(['Adonis/Addons/Repl'], (Repl) => {
			const { defineReplBindings } = require('../src/Bindings/Repl')
			defineReplBindings(this.app, Repl)
		})
	}

	/**
	 * Called when registering providers
	 */
	public register(): void {
		this.registerDatabase()
		this.registerOrm()
		this.registerSchema()
		this.registerFactory()
		this.registerBaseSeeder()
	}

	/**
	 * Called when all bindings are in place
	 */
	public boot(): void {
		this.registerHealthChecker()
		this.defineValidationRules()
		this.defineReplBindings()
	}

	/**
	 * Gracefully close connections during shutdown
	 */
	public async shutdown() {
		await this.app.container.resolveBinding('Adonis/Lucid/Database').manager.closeAll()
	}
}
