const mongoose=require('mongoose')
const userdataSchema = require('../models/userModel')
const categorySchema = require('../models/category')
const productSchema = require('../models/products')
const cartSchema = require('../models/cart')
const wishlistSchema = require('../models/wishlist')
const addressSchema = require('../models/userAddress')
const orderSchema = require('../models/orderDetails')
const productReviewSchema = require('../models/productReview')
const couponSchema = require('../models/coupons')
const productReturnSchema = require('../models/productReturn')
const walletSchema = require('../models/wallet')
const bannerSchema = require('../models/banner')

mongoose.connect(process.env.MONGO_URL)
.then(()=>console.log("Database Connected"))
.catch(()=>console.log("Failed to connect database"))



const user=mongoose.model("userdatas",userdataSchema)

const category = mongoose.model("category",categorySchema)

const products = mongoose.model("products",productSchema)

const cart = mongoose.model('cartCollection',cartSchema)

const wishlist = mongoose.model('wishlists',wishlistSchema)

const userAddress = mongoose.model('addresses',addressSchema)

const orders = mongoose.model('ordersDetails', orderSchema)

const productReview = mongoose.model('productReviews',productReviewSchema)

const coupons = mongoose.model('coupons',couponSchema)

const productReturn = mongoose.model('productReturns',productReturnSchema)

const userWallet = mongoose.model('userWallet',walletSchema)

const banner = mongoose.model('banners',bannerSchema)

module.exports={
    user,
    category,
    products,
    cart,
    wishlist,
    userAddress,
    orders,
    productReview,
    coupons,
    productReturn,
    userWallet,
    banner
}