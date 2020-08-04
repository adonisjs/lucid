/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'
import { join } from 'path'
import { Registrar, Ioc } from '@adonisjs/fold'
import { Application } from '@adonisjs/application/build/standalone'

import { Database } from '../src/Database'
import { scope } from '../src/Helpers/scope'
import { BaseSeeder } from '../src/BaseSeeder'
import { FactoryManager } from '../src/Factory'
import { BaseModel } from '../src/Orm/BaseModel'
import * as decorators from '../src/Orm/Decorators'

test.group('Database Provider', () => {
	test('register database provider', async (assert) => {
		const ioc = new Ioc()
		ioc.bind('Adonis/Core/Application', () => {
			return new Application(join(__dirname, 'fixtures'), ioc, {}, {})
		})

		await new Registrar(ioc, join(__dirname, '..'))
			.useProviders(['@adonisjs/core', './providers/DatabaseProvider'])
			.registerAndBoot()

		assert.instanceOf(ioc.use('Adonis/Lucid/Database'), Database)
		assert.deepEqual(ioc.use('Adonis/Lucid/Orm'), { BaseModel, scope, ...decorators })
		assert.isTrue(ioc.hasBinding('Adonis/Lucid/Schema'))
		assert.instanceOf(ioc.use('Adonis/Lucid/Factory'), FactoryManager)
		assert.deepEqual(ioc.use('Adonis/Lucid/Seeder'), BaseSeeder)
	})

	test('register health checker', async (assert) => {
		const ioc = new Ioc()
		ioc.bind('Adonis/Core/Application', () => {
			return new Application(join(__dirname, 'fixtures'), ioc, {}, {})
		})

		await new Registrar(ioc, join(__dirname, '..'))
			.useProviders(['@adonisjs/core', './providers/DatabaseProvider'])
			.registerAndBoot()

		const HealthCheck = ioc.use('Adonis/Core/HealthCheck')
		assert.equal(HealthCheck.healthCheckers['lucid'], 'Adonis/Lucid/Database')
	})

	test('register validator rules', async (assert) => {
		const ioc = new Ioc()
		ioc.bind('Adonis/Core/Application', () => {
			return new Application(join(__dirname, 'fixtures'), ioc, {}, {})
		})

		await new Registrar(ioc, join(__dirname, '..'))
			.useProviders(['@adonisjs/core', './providers/DatabaseProvider'])
			.registerAndBoot()

		const Validator = ioc.use('Adonis/Core/Validator')
		assert.property(Validator['rules'], 'unique')
		assert.property(Validator['rules'], 'exists')
	})
})
