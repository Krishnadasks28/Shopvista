const mongoose = require('mongoose')

const cartSchema = mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"userdatas"
    },
    userName:{
        type:String,
        required:true
    },
    items:[{
        product:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'products',
            required:false
        },
        productName:{
            type:String,
            required:false
        },
        size:{
            type:String,
            required:false,
        },
        quantity:{
            type:Number,
            default:1,
            required:function(){
                return this.product != null;
            }
        },
        productPrice:{
            type:Number,
            required:false
        },
        cartPrice:{
            type:Number,
            required:false
        }
    }],
    totalPrice:{
        type:Number,
        required:false
    }
},{timestamps:true})


module.exports = cartSchema