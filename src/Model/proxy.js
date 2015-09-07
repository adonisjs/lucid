'use strict'

const _ = require('lodash')
const mapper = require('./mapper')

let proxy = exports = module.exports = {}
let methods = {}

methods.has = function(target,name){
  return target[name] !== undefined;
}

methods.get = function(target,name){

  if(name === 'get'){
    return function(){
      return target.connection
    }
  }

  // check method of Model
  // check method as scoped method
  // assume method is called on query

  if(target[name]){
    return target[name]
  }

  if(target.attributes[name]){
    return target.attributes[name]
  }

  const scopeFunc = mapper.makeScoped(target,name)
  if(scopeFunc){
    return function(){
      scopeFunc(target.connection)
      return this
    }
  }

  if(target.made){
    target.made = false
    return target
  }
  return target.connection[name]

}

methods.set = function(target,name,value){
  if(mapper.notAttr(name)){
    target[name] = value
  }else{
    target.attributes[name] = value
  }
}

methods.iterate = function* (target){
  for (var p in target) yield p;
}

methods.enumerate = function(target){
  return Object.keys(target);
}


proxy.create = function(target){
  return Proxy.create({

    has: function(name){
      return methods.has(target,name)
    },
    get: function(proxy,name){
      return methods.get(target,name)
    },
    set: function(proxy,name,value){
      return methods.set(target,name,value)
    },
    iterate: function *(){
      return yield methods.iterate(target)
    },
    enumerate: function(){
      return methods.enumerate(target)
    },
    getOwnPropertyNames: function(){
      return Object.getOwnPropertyNames(target);
    },
    keys: function(){
      return Object.keys(target);
    },
    getOwnPropertyDescriptor: function(key){
      var desc = Object.getOwnPropertyDescriptor(target, key);
      if (desc) {
        desc.configurable = true;
        return desc;
      }
      return desc;
    },
    getPropertyDescriptor: function(key){
      var o = target;
      while (o) {
        var desc = Object.getOwnPropertyDescriptor(o, key);
        if (desc) {
          desc.configurable = true;
          return desc;
        }
        o = Object.getPrototypeOf(o);
      }
    }
  })
}
