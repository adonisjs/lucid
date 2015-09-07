'use strict'

let mapper = exports = module.exports = {};

mapper.titleCase = function(str){
  return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

mapper.makeScoped = function(target,name){
  name = `scope${mapper.titleCase(name)}`
  return target[name] || null
}

mapper.notAttr = function(name){
  if(name.charAt(0) === '_' || name === 'attributes' || name === 'made'){
    return true
  }else{
    return false;
  }
}
