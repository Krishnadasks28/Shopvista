const mongoose = require('mongoose')


const userdataSchema = mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    firstName:{
        type:String,
        required:false
    },
    lastName:{
        type:String,
        required:false
    },
    gender:{
        type:String,
        required:false
    },
    mobile: {
        type: Number,
        required: true,
    },
    email: {
        type: String,
        required: false
    },
    password: {
        type: String,
        required: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    orders:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'orderDetails',
        required:false
    }],
    coupons:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'coupons',
        required:false
    }],
    wallet:{
        type:Number,
        required:false
    }

}, { timestamps: true })

module.exports = userdataSchema


