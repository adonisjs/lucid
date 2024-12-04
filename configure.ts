/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import string from '@poppinss/utils/string'
import { presetLucid, DIALECTS } from '@adonisjs/presets/lucid'
import type Configure from '@adonisjs/core/commands/configure'

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  let dialect: string | undefined = command.parsedFlags.db
  let shouldInstallPackages: boolean | undefined = command.parsedFlags.install

  /**
   * Prompt to select the dialect when --db flag
   * is not used.
   */
  if (dialect === undefined) {
    dialect = await command.prompt.choice(
      'Select the database you want to use',
      Object.keys(DIALECTS).map((dialectKey) => {
        return {
          name: dialectKey,
          message: DIALECTS[dialectKey as keyof typeof DIALECTS].name,
        }
      }),
      {
        validate(value) {
          return !!value
        },
      }
    )
  }

  /**
   * Show error when selected dialect is not supported
   */
  if (dialect! in DIALECTS === false) {
    command.logger.error(
      `The selected database "${dialect}" is invalid. Select one from: ${string.sentence(
        Object.keys(DIALECTS)
      )}`
    )
    command.exitCode = 1
    return
  }

  /**
   * Prompt when `install` or `--no-install` flags are
   * not used
   */
  if (shouldInstallPackages === undefined) {
    shouldInstallPackages = await command.prompt.confirm(
      'Do you want to install additional packages required by "@adonisjs/lucid"?'
    )
  }

  const codemods = await command.createCodemods()
  await presetLucid(codemods, command.app, {
    dialect: dialect as keyof typeof DIALECTS,
    installPackages: !!shouldInstallPackages,
  })
}
