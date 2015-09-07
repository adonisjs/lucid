'use strict'

const proxy = require('./proxy')
const query = require('./query')

class Model{

  constructor(attributes){
    this.attributes = attributes || {}
    this.connection = query.table(this.constructor.table)
    this.primaryKey = this.constructor.primaryKey || 'id'
    return proxy.create(this)
  }

  save(values){
    values = values || this.attributes
    this.attributes = {}
    return this.insert(values)
  }

  update(values){
    values = values || this.attributes
    return this.connection.update(values)
  }

  static find (id){

    let self = new this()

    return new Promise(function(resolve,reject){
      self
      .where(self.primaryKey,id)
      .first()
      .then (function (result) {
        self.attributes = result
        self.made = true
        resolve(self)
      }).catch(reject)
    })

  }

}

module.exports = Model
