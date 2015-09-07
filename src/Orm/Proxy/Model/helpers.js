'use strict'

const changeCase = require('change-case')
const _ = require('lodash')

let helpers = exports = module.exports = {};

helpers.mutateField = function(target,field){
  const setter = `set${changeCase.pascalCase(field)}`
  return target[setter] || null
}

helpers.mutateRow = function (target,row){
  return _.object(_.map(row, function (item,index) {
    const setter = helpers.mutateField(target,index)
    const setterValue = setter ? setter(item) : item
    return [index,setterValue]
  }))
}

helpers.mutateSetters = function (target,values){
  if(_.isArray(values)){
    return _.map(values, function (value) {
      return helpers.mutateRow(target,value)
    })
  }
  return helpers.mutateRow(target,values)
}

helpers.addTimeStamps = function(rows,keys){
  if(_.isArray(rows)){
    rows = _.map(rows, function (row) {
      return helpers.rowTimeStamp(row,keys)
    })
  }else{
    rows = helpers.rowTimeStamp(rows,keys)
  }
  return rows;
}

helpers.rowTimeStamp = function (row,keys){
  const currentTimeStamp = new Date()
  keys.forEach(function (key){
    row[key] = currentTimeStamp
  })
  return row
}
