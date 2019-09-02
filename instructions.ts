/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { join } from 'path'
import sinkStatic from '@adonisjs/sink'
import { ApplicationContract } from '@poppinss/application'

export function instructions (
  projectRoot: string,
  application: ApplicationContract,
  { TemplateFile, EnvFile, kleur }: typeof sinkStatic,
) {
  const dest = `${application.directoriesMap.get('config')}/database.ts`
  const src = join(__dirname, 'config', 'database.txt')

  new TemplateFile(projectRoot, dest, src)
    .apply({})
    .commit()

  console.log(`  create  ${kleur.green(dest)}`)

  const env = new EnvFile('.env')

  env.set('DB_CONNECTION', 'sqlite')
  env.set('DB_HOST', '127.0.0.1')
  env.set('DB_USER', 'lucid')
  env.set('DB_PASSWORD', 'lucid')
  env.set('DB_NAME', 'lucid')

  env.commit()

  console.log(`  update  ${kleur.green('.env')}`)
}
