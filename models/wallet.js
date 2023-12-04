const mongoose = require('mongoose')

const walletSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    balance: {
        type: Number,
        default: 0
    },
    income: [{
        amount: {
            type: Number,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        date: {
            type: Date,
        },
        description: {
            type: String,
        }
    }],
    expense: [{
        amount: {
            type: Number,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        date: {
            type: Date,
        },
    }]
},{timestamps:true})

module.exports = walletSchema