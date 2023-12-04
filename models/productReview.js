const mongoose = require('mongoose')

productReviewSchema = mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'products',
        required: true,
    },
    productName: {
        type: String,
        required: true
    },
    reviews: [{
        userId: {
            type:mongoose.Schema.Types.ObjectId,
            ref: 'userModel',
            required: true
        },
        userName:{
            type:String,
            required:true
        },
        reviewTitle:{
            type:String,
            required:true
        },
        description:{
            type:String,
            required:true
        },
        rating:{
            type:Number,
            required:true
        },
        reviewDate:{
            type:Date,
            required:true
        }
    }]
},{timestamps:true})

module.exports = productReviewSchema