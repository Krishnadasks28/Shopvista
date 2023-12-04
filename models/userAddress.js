const mongoose = require('mongoose')

addressSchema = mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:'userdatas'
    },
    addresses:[{
        addressType:{
            type:String,
            required:false,
        },
        name:{
            type:String,
            required:true
        },
        phone:{
            type:Number,
            required:true
        },
        pincode:{
            type:Number,
            required:true
        },
        locality:{
            type:String,
            required:true
        },
        address:{
            type:String,
            required:true
        },
        city:{
            type:String,
            required:true
        },
        state:{
            type:String,
            required:true
        },
        landmark:{
            type:String,
            required:false
        },
        alternatePhone:{
            type:Number,
            required:false
        },
        isDefault:{
            type:Boolean,
            default:false
        }
    }]
},{timestamps:true})

module.exports = addressSchema