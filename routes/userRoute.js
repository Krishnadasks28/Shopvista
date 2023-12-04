const express = require('express')
const router = express.Router()
const { isUserLoggedIn, isUserLoggedOut} = require('../middileware/userAuth')
const userController = require('../controller/userController')


//signup route
router.get('/signup', isUserLoggedOut,userController.loadUserSignup)
router.post('/signup', isUserLoggedOut,userController.isExistingUser )

//create new user
router.post('/createUser', isUserLoggedOut, userController.insertUser)

//user login with password
router.get('/login', isUserLoggedOut, userController.loadUserLogin)
router.post('/login', isUserLoggedOut, userController.loadShop)


//OTP login
router.get('/otp_login', isUserLoggedOut, userController.loadOtpLogin)

router.post('/checkNumber',userController.checkNumber)

router.post('/createSession', userController.loadShopOtp)


//search and find products
router.get('/searchProduct/:page',userController.searchProducts)

//product Details
router.get('/productDetails',userController.productDetails)

//review and rate product
router.get('/rateProduct',isUserLoggedIn,userController.rateProduct)

router.post('/addReview',isUserLoggedIn,userController.addReview)

//user profile
router .get('/profile',isUserLoggedIn,userController.loadProfile)

//update personal information
router.post('/updatePersonalInfo',isUserLoggedIn,userController.updatePersonalInfo)

//load cart
router.get('/cart',isUserLoggedIn,userController.loadCart)

//add products to cart
router.post('/addToCart',isUserLoggedIn,userController.addToCart)

//Remove item from cart
router.post('/removeFromCart',isUserLoggedIn,userController.removeFromCart)

//load wishlist
router.get('/wishlist',isUserLoggedIn,userController.loadWishlist)

//remove from wishlist
router.post('/removeFromWishlist',isUserLoggedIn,userController.removeFromWishlist)

//move item from cart to wishlist
router.post('/moveToWishlist',isUserLoggedIn,userController.moveToWishlist)

//change Quantity of cart product
router.post('/changeQuantity',isUserLoggedIn,userController.changeQuantity)

//manage adresses
router.get('/manageAddress',isUserLoggedIn,userController.manageAddress)

//Add address
router.post('/addAddress',isUserLoggedIn,userController.addAddress)


//load checkout
router.get('/checkout',isUserLoggedIn,userController.loadCheckout)

//checkout for single product
router.get('/checkOutOne',isUserLoggedIn,userController.checkOutForOne)

//change default address
router.post('/setDefaultAddress',isUserLoggedIn,userController.setDefaultAddress)

//edit address 
router.post('/editAddress',isUserLoggedIn,userController.editAddress)

//remove address
router.post('/removeAddress',isUserLoggedIn,userController.removeAddress)

//load online payment gateway
router.post('/payOnline',isUserLoggedIn,userController.onlinePayment)

//confirm order
router.post('/confirmOrder',isUserLoggedIn,userController.confirmOrder)

//load order management
router.get('/orders/:page',isUserLoggedIn,userController.manageOrders)

//load details of each order
router.get('/orderDetails',isUserLoggedIn,userController.orderDetails)

//invoice
router.get('/downloadInvoice',isUserLoggedIn,userController.getInvoice)

//refund amount to bank
router.post('/refundToBank',isUserLoggedIn,userController.refundToBank)

//cancel order
router.post('/orderCancel',isUserLoggedIn,userController.cancelOrder)

router.post('/addToWallet',isUserLoggedIn,userController.addToWallet)

//load wallet page
router.get('/wallet',isUserLoggedIn,userController.loadWallet)

///sending return request
router.post('/requestReturn',isUserLoggedIn,userController.requestReturn)

//user logout
router.get('/logout', isUserLoggedIn, userController.logoutUser)



module.exports = router

