'use strict'

const Schema = require('../../../src/Schema')

class Users extends Schema {

  up () {
    this.create('accounts', function (table) {
      table.increments('id')
      table.string('account_id')
    })
  }

}

module.exports = Users
