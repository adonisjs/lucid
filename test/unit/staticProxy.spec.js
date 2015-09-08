'use strict'

const path = require('path')
const chai = require('chai')
const expect = chai.expect
const co = require('co')
const Database = require('../../src/Orm/Proxy/Static/database.temporary')
const StaticProxy = require('../../src/Orm/Proxy/Static')

describe('StaticProxy', function () {

  it('should proxy class static methods', function () {

    class User{

      static extend(){
        return new StaticProxy(this,Database);
      }

      static get table(){
        return 'users'
      }

    }

    User = User.extend()
    expect(User.activeConnection.client.config.client).to.equal('sqlite3')

  })

  it('should call methods directly on query builder', function() {

    class User{

      static extend(){
        return new StaticProxy(this,Database);
      }

      static get table(){
        return 'users'
      }

    }

    User = User.extend()
    expect(User.select('*').toSQL().sql).to.equal('select * from "users"')

  })

  it('should return an instance of collection on values fetched from model queries', function(done) {

      class User{
        static extend(){
          return new StaticProxy(this,Database);
        }
        static get table(){
          return 'users'
        }
      }
      User = User.extend()

      User
      .select('*')
      .first()
      .then(function (users) {
        expect(users.__actions__).deep.equal([])
        done()
      }).catch(done)
  })

  it('should allow scoped methods on class', function () {

    class User{

      static extend(){
        return new StaticProxy(this,Database);
      }
      static get table(){
        return 'users'
      }

      static scopeActive(query){
        return query.where('status','active')
      }

    }

    User = User.extend();
    User.active()
    expect(User.toSQL().sql).to.equal('select * from "users" where "status" = ?')
    expect(User.toSQL().bindings).deep.equal(['active'])

  })


})
