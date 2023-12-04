const mongoose = require('mongoose')

const productReturnSchema = mongoose.Schema({
  user:{
    type:mongoose.Schema.Types.ObjectId,
    required:true,
    ref:'userdatas'
  },
  order:{
    type:Object,
    required:true,
  },
  product:{
    type:mongoose.Schema.Types.ObjectId,
    required:true,
    ref:'products'
  },
  returnReason:{
    type:String,
    required:true
  },
  returnStatus:{
    type:String,
    default:'Request Processing'
  },
  refundMethod:{
    type:String,
    required:true
  },
  refundStatus:{
    type:String,
    required:false
  }
},{timeStamps:true})

module.exports = productReturnSchema