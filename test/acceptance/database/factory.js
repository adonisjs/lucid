'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Factory = use('Adonis/Src/Factory')

Factory.blueprint('App/Model/User', function (faker) {
  return {
    username: faker.internet.userName(),
    email: faker.internet.email(),
    firstname: faker.name.firstName(),
    lastname: faker.name.lastName(),
    password: faker.internet.password()
  }
})
