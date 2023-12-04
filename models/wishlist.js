const mongoose = require('mongoose')

const wishlistSchema = mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:'userdatas'
    },
    items:[{
        product:{
            type:mongoose.Schema.Types.ObjectId,
            required:false,
            ref:'products'
        },
        productName:{
            type:String,
            required:false
        }
    }]
},{timestamps:true})


module.exports = wishlistSchema