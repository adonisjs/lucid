'use strict'

require('harmony-reflect');

var handler = {

  has: function() { return true; },

  set: function(target, name, value) {
   target[name] = value; return true;
  },

  get: function(target,name){
    if(target[name]){
      return target[name]
    }else{
      // call some magic method
      return 'foo'
    }
  },

  construct: function(target){
    return new target
  },

  apply: function(){
    return target
  },

  getPrototypeOf: function(target){
    console.log('here>>>')
    return target
  },

  setPrototypeOf: function(){
    console.log(arguments)
  }

}


var handler2 = {

  has: function() { return true; },

  set: function(target, name, value) {
   target[name] = value; return true;
  },

  get: function(target,name){
    if(target[name]){
      return target[name]
    }else{
      // call some magic method
      return 'bar'
    }
  },

  construct: function(target){
    return new target
  },

  apply: function(){
    return target
  },

  getPrototypeOf: function(target){
    console.log('here>>>')
    return target
  },

  setPrototypeOf: function(){
    console.log(arguments)
  }

}

class Model{

  constructor(){
    return new Proxy(this,handler2)
  }

}


class BaseModel extends Model{

  static extend(){
    return new Proxy(this,handler)
  }

}


class User extends BaseModel{
}

User = User.extend()
console.log(new User().foo)
