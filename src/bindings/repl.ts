/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Repl } from '@adonisjs/core/repl'
import type { ApplicationService } from '@adonisjs/core/types'

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
export function defineReplBindings(app: ApplicationService, Repl: Repl) {
  /**
   * Load all models to the models property
   */
  Repl.addMethod(
    'loadModels',
    async (repl) => {
      const modelsPath = app.modelsPath()
      console.log(
        repl.colors.dim(`recursively reading models from "${app.relativePath(modelsPath)}"`)
      )

      const { fsImportAll } = await import('@poppinss/utils')
      setupReplState(repl, 'models', await fsImportAll(modelsPath))
    },
    {
      description: 'Recursively load Lucid models to the "models" property',
    }
  )

  /**
   * Load database provider to the Db provider
   */
  Repl.addMethod(
    'loadDb',
    async (repl) => {
      setupReplState(repl, 'db', await app.container.make('lucid.db'))
    },
    {
      description: 'Load database provider to the "db" property',
    }
  )

  /**
   * Load all factories to the factories property
   */
  Repl.addMethod(
    'loadFactories',
    async (repl) => {
      const factoriesPath = app.factoriesPath()
      console.log(
        repl.colors.dim(`recursively reading models from "${app.relativePath(factoriesPath)}"`)
      )

      const { fsImportAll } = await import('@poppinss/utils')
      const factories = await fsImportAll(factoriesPath, { ignoreMissingRoot: true })

      if (!factories) {
        return
      }

      setupReplState(repl, 'factories', factories)
    },
    {
      description: 'Recursively load factories to the "factories" property',
    }
  )
}
