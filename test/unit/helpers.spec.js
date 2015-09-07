'use strict'

const path = require('path')
const chai = require('chai')
const expect = chai.expect
const co = require('co')
const helpers = require('../../src/Orm/Proxy/Static/helpers')

describe('Helpers', function () {

  it('should convert snake case methods into camelcase scope methods', function () {

    const target = {
      scopeActiveUsers: function(){
        return 'foo'
      }
    }

    const scopedMethod = helpers.makeScoped(target,'active_users')
    expect(scopedMethod()).to.equal('foo')

  })


  it('should make table name when table name does not exists as model static property', function () {
    class User{
    }
    expect(helpers.getTableName(User)).to.equal('users')
  })


})
