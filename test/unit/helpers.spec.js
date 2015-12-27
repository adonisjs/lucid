'use strict'

/* global describe, it*/
const chai = require('chai')
const expect = chai.expect
const helper = require('../../src/Orm/Proxy/Static/helper')
const modelHelper = require('../../src/Orm/Proxy/Model/helper')

describe('Helpers', function () {
  it('should convert snake case methods into camelcase scope methods', function () {
    class Target {
      scopeActiveUsers () {
        return 'foo'
      }
    }

    const scopedMethod = helper.makeScoped(Target, 'active_users')
    expect(scopedMethod()).to.equal('foo')
  })

  it('should make table name when table name does not exists as model static property', function () {
    class User {
    }
    expect(modelHelper.getTableName(User)).to.equal('users')
  })
})
