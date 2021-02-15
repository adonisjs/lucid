/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ReplContract } from '@ioc:Adonis/Addons/Repl'
import { requireAll } from '@poppinss/utils/build/helpers'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

/**
 * Helper to define REPL state
 */
function setupReplState(repl: any, key: string, value: any) {
	repl.server.context[key] = value
	repl.notify(
		`Loaded ${key} module. You can access it using the "${repl.colors.underline(key)}" variable`
	)
}

/**
 * Define REPL bindings
 */
export function defineReplBindings(app: ApplicationContract, Repl: ReplContract) {
	/**
	 * Load all models to the models property
	 */
	Repl.addMethod(
		'loadModels',
		(repl) => {
			const modelsPath = app.resolveNamespaceDirectory('models') || 'app/Models'
			console.log(repl.colors.dim(`recursively reading models from "${modelsPath}"`))

			const modelsAbsPath = app.makePath(modelsPath)
			setupReplState(repl, 'models', requireAll(modelsAbsPath))
		},
		{
			description: 'Recursively models Lucid models to the "models" property',
		}
	)

	/**
	 * Load database provider to the Db provider
	 */
	Repl.addMethod(
		'loadDb',
		(repl) => {
			setupReplState(repl, 'Db', app.container.use('Adonis/Lucid/Database'))
		},
		{
			description: 'Load database provider to the "Db" property',
		}
	)
}
