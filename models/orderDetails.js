const mongoose = require('mongoose')

orderDetailsSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userdatas',
        required: true
    },
    orders: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'userdatas',
            required: true
        },
        userName: {
            type: String,
            required: false
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'products',
            required: false
        },
        productName: {
            type: String,
            required: false
        },
        size: {
            type: [String,Number],
            required: false
        },
        quantity: {
            type: Number,
            default: 1,
            required: function () {
                return this.product != null;
            }
        },
        productPrice: {
            type: Number,
            required: false
        },
        cartPrice: {
            type: Number,
            required: false
        },
        couponUsed: {
            type: String,
            required: false
        },
        discount:{
            type:Number,
            required:false
        },
        orderDate: {
            type: Date,
            required: false
        },
        deliverDate: {
            type: Object,
            required: false
        },
        orderNumber: {
            type: String,
            required: true
        },
        orderStatus: {
            type: String,
            default: "Processing"
        },
        paymentMethod: {
            type: String,
            required: true
        },
        shippingAddress: {
            type: Object,
            required: true
        },
        paymentStatus: {
            type: String,
            required: true
        },
        paymentId: {
            type: String,
            required: false
        },
        shippingStatus: {
            type: String,
            default: "In Transit"
        },
        refundStatus: {
            type: String,
            required: false
        },
        refundId: {
            type: String,
            required: false
        },
        updatedAt: {
            type: Date,
            required: false
        }
    }],
    totalPurchase: {
        type: Number,
        default: 0
    }
}, { timestamps: true })





orderDetailsSchema.index({ createdAt: 1, "orders.productName": "text" })


module.exports = orderDetailsSchema
