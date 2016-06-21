'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Ioc = require('adonis-fold').Ioc
const Factory = Ioc.use('Adonis/Src/Factory')

Factory.blueprint('App/Model/User', function (fake) {
  return {
    username: fake.username(),
    email: fake.email(),
    firstname: fake.first(),
    lastname: fake.last(),
    password: fake.password()
  }
})
