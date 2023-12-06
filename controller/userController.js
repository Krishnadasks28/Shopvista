const path = require('path')
const fs = require('fs')
const { user, products, category, cart, wishlist, userAddress, orders, productReview, coupons, productReturn, userWallet, banner } = require('../database/mongodb')
const bcrypt = require('bcrypt')
const asyncHandler = require('express-async-handler')
const ejs = require('ejs')
const Razorpay = require('razorpay')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY
})



//load home page
const loadHome = asyncHandler(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    let product = await products.find({ $and: [{ isListed: true }, { quantity: { $gt: 0 } }] }).sort({ createdAt: -1 }).limit(12)
    let loggedIn = false
    let cartItems
    let wishlists
    if (req.session.user) {
        const userdata = await user.findOne({ username: req.session.user })
        console.log("Userdata :", userdata)
        if (userdata.isBlocked === true) {
            req.session.user = null
            req.session._id = null
            res.render('./User/login', { title: "Login", loginErr: "Restricted Account." })
        } else {
            loggedIn = true
            cartItems = await cart.findOne({ user: req.session._id })
            console.log(cartItems)
            if (cartItems) {
                cartItems = cartItems.items.map((item) => item.product)
            }
            wishlists = await wishlist.findOne({ user: req.session._id }).populate('items.product')
            if (wishlists) {
                wishlists = wishlists.items.map((item) => item.product)
            }
        }

    }

    let allBanners = await banner.find().sort({ createdAt: -1 }).limit(3);
    let activeBanners = allBanners.filter(banner => banner.status === 'Active');
    res.render('./User/home', { title: "Shopvista", product, loggedIn, cartItems, wishlists, banners:activeBanners })
    res.end()

})


//get signup page
const loadUserSignup = asyncHandler(async (req, res) => {
    res.header('Cache-Control', 'no-cache,must-revalidate');
    res.render('./User/signup', { title: "Signup" })
    res.end()
})



//create new user by signing up
const isExistingUser = asyncHandler(async (req, res) => {
    res.header('Cache-Control', 'no-cache,must-revalidate');
    const existingMobile = await user.findOne({ mobile: req.body.userData.phoneNumber })

    if (req.body.userData.email) {
        var existingEmail = await user.findOne({ email: req.body.userData.email })
    }

    if (existingEmail || existingMobile) {
        console.log("Existing User", existingMobile)

        return res.status(400).end()


    }
    else {
        return res.status(200).end()
    }

})


//create new user and insert data to mongodb
const insertUser = asyncHandler(async (req, res) => {
    console.log("data inputing.....")
    const userData = req.body.userData
    console.log(userData)
    let WELCOME20 = await coupons.findOne({ couponName: "WELCOME20" })
    WELCOME20 = WELCOME20._id


    var hashedPassword = await bcrypt.hash(userData.password, 10)
    var data = {
        "username": userData.username,
        "mobile": userData.phoneNumber,
        "email": userData.email,
        "password": hashedPassword,
        "coupons": [WELCOME20]
    }

    await user.create(data)
        .then(() => console.log("Data inserted successfully."))
        .then(async () => {
            const currentUser = await user.findOne({ "username": userData.username })
            req.session._id = currentUser._id
            req.session.user = userData.username
            await cart.create({ "user": req.session._id, "userName": req.session.user })
            await userWallet.create({ "userId": req.session._id, "username": req.session.user })
        })
        .catch((err) => console.log(err))

    res.redirect('/')

})


//load login page
const loadUserLogin = asyncHandler(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.render('./User/login', { title: "Login" })
    res.end()

})

//verify user login with password
const loadShop = asyncHandler(async (req, res) => {
    const userdata = await user.findOne({ mobile: req.body.mobile })

    if (!userdata) {
        res.render("./User/login", { loginErr: "The user does not exist.", title: "Login" })
        res.end()
    }

    bcrypt.compare(req.body.password, userdata.password, (err, result) => {
        if (err) {
            console.log(err)
        }
        else if (result) {
            req.session.user = userdata.username
            req.session._id = userdata._id
            console.log(userdata._id, req.session._id)
            res.redirect('/')
        }
        else {
            res.render('./User/login', { title: "Login", loginErr: "Invalid password" })
            console.log("password not match")
        }
    })


})

//forgot password, login with OTP
const loadOtpLogin = asyncHandler(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.render('./User/verifyOTP', { title: "OTP Login" })
    res.end()
})

//
const checkNumber = asyncHandler(async (req, res) => {
    if (req.body.phone) {
        const existingUser = await user.findOne({ mobile: req.body.phone })

        if (existingUser) {
            res.status(200)
        }
        else {
            res.status(400)
        }
    }
    res.end()
})

const loadShopOtp = asyncHandler(async (req, res) => {
    console.log("current route : /user/createSession")
    let userdata = await user.findOne({ mobile: req.body.phone })
    console.log(userdata)
    if (userdata) {
        if (userdata.isBlocked === false) {
            req.session.user = userdata.username
            res.status(200)

        }
        else {
            console.log("OTP Login failed because user is blocked")
            res.status(400)
        }
    }
    else {
        res.status(404)
    }
    res.end()
})

//check if user is blocked or not
const isUserBlocked = asyncHandler(async (req, res, next) => {
    const userData = await user.findOne({ "username": req.session.user })
    console.log(userData)
    if (userData.isBlocked === false) {
        next()
    }
    else {
        res.render('./User/login', { title: "Login", loginErr: "Your account has been blocked." })
        res.end()
    }
})

//search and find products
const searchProducts = asyncHandler(async (req, res) => {
    const perPage = 4
    const page = parseInt(req.params.page) || 1
    const searchKey = req.query.searchkey
    let productList = await products.find({ $and: [{ $text: { $search: searchKey } }, { isListed: true }, { quantity: { $gt: 0 } }] }).skip((page - 1) * perPage).limit(perPage).exec()
    let totalProducts = await products.countDocuments({ $and: [{ $text: { $search: searchKey } }, { isListed: true }, { quantity: { $gt: 0 } }] });
    if (!productList.length) {
        let matchingCategories = await category.find({ $text: { $search: searchKey } })
        console.log("Categories list", matchingCategories)
        productList = await products.find({ $and: [{ categoryName: { $in: matchingCategories } }, { isListed: true }, { quantity: { $gt: 0 } }] }).skip((page - 1) * perPage).limit(perPage).exec()
        totalProducts = await products.countDocuments({ $and: [{ categoryName: { $in: matchingCategories } }, { isListed: true }, { quantity: { $gt: 0 } }] })
    }
    let loggedIn = false
    let cartItems
    if (req.session.user) {
        loggedIn = true
        cartItems = await cart.find({ user: req.session._id })
        cartItems = cartItems[0].items.map((item) => item.product)
    }
    const totalPages = Math.ceil(totalProducts / perPage)
    if (productList != '') {
        res.render('./User/search-products', { productList, totalPages, currentPage: page, productkey: req.body.searchkey, loggedIn, cartItems })
    }
    else {
        res.redirect('back')
    }
    res.end()
})

//product details page
const productDetails = asyncHandler(async (req, res) => {
    let loggedIn = false
    if (req.session.user) {
        loggedIn = true
    }
    console.log("product Id : ", req.query.productId)
    let product = await products.findOne({ _id: req.query.productId })
    let cartItems = await cart.findOne({ user: req.session._id })
    let alreadyInCart = false


    let wishlists = await wishlist.findOne({ user: req.session._id }).populate('items.product')
    if (wishlists) {
        wishlists = wishlists.items.map((item) => item.product)
    }


    console.log('cartItems : ', cartItems)
    if (cartItems != null) {
        let product = cartItems.items.find((item) => item.product == req.query.productId)
        console.log("Cartitems : ", product)
        if (product != undefined) {
            alreadyInCart = true
        }
    }

    let ratings = await productReview.aggregate([
        { $match: { 'productName': product.title } },
        { $unwind: '$reviews' },
        { $group: { _id: '$reviews.rating', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);

    // similar products
    let similarProducts = await products.find({$and:[{categoryName:product.categoryName},{_id:{$ne:product._id}}]}).sort({createdAt:-1}).limit(4)

    let reviews = await productReview.findOne({ productId: product._id }).limit(5)
    let totalReviews
    let ratingsPercentage
    let pageParams
    if (reviews != null) {
        totalReviews = reviews.reviews.length

        ratingsPercentage = {
            fiveStar: ((ratings.find((item) => item._id == 5)?.count || 0) / totalReviews) * 100,
            fourStar: ((ratings.find((item) => item._id == 4)?.count || 0) / totalReviews) * 100,
            threeStar: ((ratings.find((item) => item._id == 3)?.count || 0) / totalReviews) * 100,
            twoStar: ((ratings.find((item) => item._id == 2)?.count || 0) / totalReviews) * 100,
            oneStar: ((ratings.find((item) => item._id == 1)?.count || 0) / totalReviews) * 100,
        }

        reviews.reviews.forEach((item) => {
            item.convertedDate = convertDateAndTime(item.reviewDate)
            console.log("item.reviewDate : ", item.convertedDate.day)
        })
        console.log("reviews : ", reviews.reviews.length)
        console.log("rating : ", ratings.length)
        pageParams = { title: "Product Details", product, alreadyInCart, loggedIn: loggedIn, ratings, reviews: reviews.reviews, ratingsPercentage, wishlists, similarProducts }
    }
    else {
        pageParams = { title: "Product Details", product, alreadyInCart, loggedIn: loggedIn, wishlists, similarProducts }
    }
    res.render('./User/products/productDetails', pageParams)
    res.end()
})

//rate and review product
const rateProduct = asyncHandler(async (req, res) => {

    let productId = req.query.productId
    let userOrders = await orders.findOne({ user: req.session._id })
    userOrders = userOrders.orders
    let productBought = false
    for (let i = 0; i < userOrders.length; i++) {
        if (userOrders[i].product == productId && userOrders[i].orderStatus == 'Delivered') {
            productBought = true
            break
        }
    }

    console.log("ProductId : ", productId)
    let product = await products.findOne({ _id: productId })
    let reviews = await productReview.findOne({ productId: productId })
    let totalReviews
    let topRating
    let pageParams
    if (reviews) {
        topRating = await productReview.aggregate([
            { $match: { 'productName': product.title } },
            { $unwind: '$reviews' },
            { $group: { _id: '$reviews.rating', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);
        console.log("Top rating : ", topRating)
        totalReviews = reviews.reviews.length
        console.log("total reviews : ", reviews.reviews.length)
        pageParams = { title: "Rate & review product", product, topRating: topRating[0]._id, totalReviews, productBought, loggedIn: true }
    }
    else {
        pageParams = { title: "Rate & review product", product, productBought, loggedIn: true }
    }
    res.render('./User/products/rateProduct', pageParams)
    res.end()
})

const addReview = asyncHandler(async (req, res) => {
    const reviewData = {
        userId: req.session._id,
        userName: req.session.user,
        reviewTitle: req.body.reviewTitle,
        description: req.body.description,
        rating: req.body.starCount,
        reviewDate: new Date()
    }
    console.log("Review data : ", reviewData)

    await productReview.updateOne({ productId: req.body.productId }, { $set: { productName: req.body.productName }, $push: { reviews: reviewData } }, { upsert: true })
    let product = await products.findOne({ _id: req.body.productId })
    res.redirect('back')
})


//load user profile
const loadProfile = asyncHandler(async (req, res) => {
    const userdata = await user.findOne({ _id: req.session._id })
    res.render('./User/manageProfile/profile', { title: "My profile", userdata, username: userdata.username, loggedIn: true, wallet: userdata.wallet })
})

//update personal information
const updatePersonalInfo = asyncHandler(async (req, res) => {
    const formData = req.body
    const update = { $set: formData }
    await user.updateOne({ _id: req.session._id }, update, { upsert: true })
    res.redirect('/user/profile')
})

//load cart
const loadCart = asyncHandler(async (req, res) => {

    let cartProducts = await cart.findOne({ user: req.session._id }).populate('items.product').exec()

    if (cartProducts != null) {
        let cartItems = cartProducts.items
        let itemsCount = cartProducts.items.length
        let totalPrice = cartProducts.items.map((item) => item.cartPrice).reduce((accumulator, currentvalue) => accumulator + currentvalue, 0)
        console.log(itemsCount)
        res.render('./User/products/cart', { title: "Shopping cart || ShopVista", cartItems, totalPrice, itemsCount, loggedIn: true })
    }
    else {
        res.render('./User/products/cart', { title: "Shopping cart || ShopVista", loggedIn: true })
        res.end()
    }

})

//Add product to cart
const addToCart = asyncHandler(async (req, res) => {

    const cartItems = await cart.find({ user: req.session._id })

    let cartPrice = req.body.productPrice * req.body.cartQuantity
    const data = {
        product: req.body.productId,
        productName: req.body.productName,
        productPrice: req.body.productPrice,
        cartPrice: cartPrice || req.body.productPrice,
        size: req.body.cartSize || '',
        quantity: req.body.cartQuantity || 1
    }
    console.log("cart quantity : ", req.body.cartQuantity)
    await cart.updateOne({ user: req.session._id }, { $push: { items: data } }, { upsert: true })
        .then(() => console.log("Item added to cart"))
        .catch((err) => console.log(err, "failed to add item to the cart"))
    res.redirect('back')
})

//Remove item from cart
const removeFromCart = asyncHandler(async (req, res) => {
    const data = {
        product: req.body.productId,
    }
    await cart.updateOne({ user: req.session._id }, { $pull: { items: data } })
    res.redirect('back')
})

//load wishlist
const loadWishlist = asyncHandler(async (req, res) => {
    const items = await wishlist.find({ user: req.session._id }).populate('items.product')

    console.log("items : ", items)
    let wishlists = []
    items.forEach((item) => {
        wishlists.push(item.items)
    })
    wishlists = [].concat(...wishlists)
    let updatedWishlist = []
    for (const item of wishlists) {
        let reviews = await productReview.findOne({ productId: item.product._id })
        console.log("reviews : ", reviews)
        if (reviews != undefined) {
            let ratings = await productReview.aggregate([
                { $match: { productId: item.product._id } },
                { $unwind: '$reviews' },
                {
                    $group: {
                        _id: '$reviews.rating',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
            ])
            item.topRating = ratings[0]._id
            item.totalReviews = reviews.reviews.length
            console.log("top Rating : ", item.topRating)
            console.log("total reviews : ", item)
        }
        updatedWishlist.push(item)
    }

    const userdata = await user.findOne({ _id: req.session._id })
    console.log("wishilist : ", updatedWishlist)
    res.render('./User/products/wishlist', { title: "My wishlist", loggedIn: true, wishlists: updatedWishlist, username: userdata.username, wallet: userdata.wallet })
    res.end()
})

//remove product from wishlist
const removeFromWishlist = asyncHandler(async (req, res) => {
    let productId = req.body.productId
    await wishlist.updateOne({ user: req.session._id }, { $pull: { items: { product: productId } } })
    res.redirect('back')
})

//Move item from cart to wishlist
const moveToWishlist = asyncHandler(async (req, res) => {
    const data = {
        product: req.body.productId,
        productName: req.body.productName
    }
    await wishlist.updateOne({ user: req.session._id }, { $push: { items: data } }, { upsert: true })
    await cart.updateOne({ user: req.session._id }, { $pull: { items: data } })
    res.redirect('back')
})

//increase and decrease the qauantity of products inside cart
const changeQuantity = asyncHandler(async (req, res) => {
    const productIdToModify = req.body.quantityPlus || req.body.quantityMinus;
    const increment = req.body.quantityPlus ? 1 : -1;

    const cartItem = await cart.findOne({ "items.product": productIdToModify });

    if (cartItem) {
        // Calculate the new quantity
        console.log(productIdToModify)
        const newQuantity = cartItem.items.find(item => item.product == productIdToModify).quantity + increment
        console.log(newQuantity)
        // Calculate the new cartPrice
        const newCartPrice = newQuantity * cartItem.items.find(item => item.product == productIdToModify).productPrice;

        // Update the cart
        await cart.updateOne(
            { "items.product": productIdToModify },
            {
                $set: {
                    "items.$.quantity": newQuantity,
                    "items.$.cartPrice": newCartPrice
                }
            }
        );
    }

    res.redirect('back')
});

//Manage Addressses
const manageAddress = asyncHandler(async (req, res) => {
    const userData = await userAddress.find({ user: req.session._id })
    let addresses
    if (userData != '') {
        addresses = userData[0].addresses
        console.log(addresses)
    }
    const userdata = await user.findOne({ _id: req.session._id })
    res.render('./User/manageProfile/manageAddress', { title: "Address Management", username: req.session.user, loggedIn: true, addresses, wallet: userdata.wallet })
})

//Add new address
const addAddress = asyncHandler(async (req, res) => {
    const defaultAddress = await userAddress.findOne({$and:[{ user: req.session._id },{isDefault:true}]})
    let isDefault = false
    if (defaultAddress === null || defaultAddress == '') {
        isDefault = true
    }
    const userID = {
        "user": req.session._id,
    }
    const data = {
        "addresses": [{
            "addressType": req.body.addressType,
            "name": req.body.name,
            "phone": req.body.mobile,
            "pincode": req.body.pincode,
            "locality": req.body.locality,
            "address": req.body.address,
            "city": req.body.city,
            "landmark": req.body.landmark,
            "state": req.body.state,
            "alternatePhone": req.body.alternateMobile,
            "isDefault": isDefault
        }]
    }
    await userAddress.updateOne({ user: req.session._id }, { $set: userID, $push: data }, { upsert: true })
        .then(() => console.log("New address added successfully"))
        .catch((err) => console.log("Failed to add new address", err))
    res.redirect('back')
})

//edit address
const editAddress = asyncHandler(async (req, res) => {
    const addressId = req.body.addressId
    const data = {
        "addresses.$[elem].addressType": req.body.addressType,
        "addresses.$[elem].name": req.body.name,
        "addresses.$[elem].phone": req.body.mobile,
        "addresses.$[elem].pincode": req.body.pincode,
        "addresses.$[elem].locality": req.body.locality,
        "addresses.$[elem].address": req.body.address,
        "addresses.$[elem].city": req.body.city,
        "addresses.$[elem].landmark": req.body.landmark,
        "addresses.$[elem].state": req.body.state,
        "addresses.$[elem].alternatePhone": req.body.alternateMobile
    }
    await userAddress.updateOne({ user: req.session._id }, { $set: data }, { arrayFilters: [{ 'elem._id': addressId }] })
        .then(() => console.log("addresses edited"))
        .catch((err) => console.log(err, "error in editing"))
    res.redirect('back')
})


///remove address
const removeAddress = asyncHandler(async(req,res)=>{
    let allAddresses = await userAddress.findOne({user:req.session._id})
    
    let newAddresses = []
    
    allAddresses.addresses.forEach((doc)=>{
        if(doc._id != req.body.addressId){
            newAddresses.push(doc)
        }
    })

    await userAddress.updateOne({user:req.session._id},{$set:{addresses:newAddresses}})
    res.redirect('back')
})


///online payment with razorpay

const onlinePayment = asyncHandler(async (req, res) => {
    console.log("key id : ", process.env.RAZORPAY_ID)
    let amount = parseInt(req.body.amount) * 100
    const options = {
        amount: amount,
        currency: "INR",
        receipt: req.session.user
    }
    let userdata = await user.findOne({ _id: req.session._id })
    razorpay.orders.create(options, (err, order) => {
        if (order) {
            console.log(order, ": order success")
            res.status(200).send({
                success: true,
                msg: "Order Created",
                order_id: order.id,
                amount: amount,
                key_id: process.env.RAZORPAY_ID,
                name: userdata.username,
                email: userdata.email,
                contact: userdata.mobile

            })
        }
        else if (err) {
            console.log("Error in creating razorpay order :", err)
            res.status(500).send()
        }
    })
})


//load checkout from cart
const loadCheckout = asyncHandler(async (req, res) => {
    if (req.session.previousRoute != '/user/confirmOrder' && req.session.previousRoute != '/user/orders/1') {
        let pageParams
        let cartProducts = await cart.findOne({ user: req.session._id }).populate('items.product').exec()
        let cartItems = cartProducts.items.map((item) => ({
            product: item.product,
            cartPrice: item.cartPrice,
            quantity: item.quantity
        }))
        let walletAmount = await userWallet.findOne({ userId: req.session._id })
        let itemsCount = cartProducts.items.length
        if (itemsCount > 0) {
            let totalPrice = cartProducts.items.map((item) => item.cartPrice).reduce((accumulator, currentvalue) => accumulator + currentvalue, 0)
            //get address of the user
            let data = await userAddress.findOne({ user: req.session._id }, { _id: 0, addresses: 1 })
            let defaultAddress
            if (data != null) {
                defaultAddress = data.addresses.find((address) => address.isDefault === true)
                if (defaultAddress == undefined) {
                    defaultAddress = data.addresses[0]
                }
                pageParams = { title: "Checkout", addresses: data.addresses, defaultAddress, cartItems, itemsCount, totalPrice, walletAmount: walletAmount.balance }
            } else {
                pageParams = { title: "Checkout", cartItems, itemsCount, totalPrice, walletAmount: walletAmount.balance }
            }
        }
        else {
            res.redirect('/user/cart')
        }
        res.render('./User/products/checkout', pageParams)
        res.end()
    }
    else {
        res.redirect('/user/cart')
    }
})

//
const checkOutForOne = asyncHandler(async (req, res) => {
    console.log("Previous route : ", req.session.previousRoute)
    if (req.session.previousRoute != '/user/confirmOrder' && req.session.previousRoute != '/user/orders/1') {
        console.log("productID : ", req.query.productUniqueId)
        let product = await products.findOne({ _id: req.query.productUniqueId })
        let quantity = req.query.checkOutQuantity || 1
        let totalPrice = quantity * product.salePrice
        let productSize = req.query.checkOutSize
        console.log("product Size: ", productSize)
        console.log("total price: ", totalPrice)

        //collecting coupons
        let allCoupons = await coupons.find({ $and: [{ usedBy: { $ne: req.session._id } }, { expiryDate: { $gt: new Date() } }, { priceLimit: { $gt: product.salePrice } }] })
        console.log("All coupons : ", allCoupons)
        let userData = await user.findOne({ _id: req.session._id }).populate('coupons').exec()
        let couponIds = new Set(allCoupons.map((coupon) => coupon.couponName))
        console.log(" coupon ids : ", couponIds)
        userData.coupons.filter((coupon) => {
            console.log("Coupon id : ", coupon.couponName)
            if (!couponIds.has(coupon.couponName)) {
                allCoupons.push(coupon)
            }
        })

        console.log("All coupons : ", allCoupons)

        let walletAmount = await userWallet.findOne({ userId: req.session._id })
        console.log("wallet amount : ", walletAmount.balance)
        let data = await userAddress.findOne({ user: req.session._id }, { _id: 0, addresses: 1 })
        let defaultAddress
        let pageParams
        if (data != null) {
            defaultAddress = data.addresses.find((address) => address.isDefault === true)
            if (defaultAddress == undefined) {
                defaultAddress = data.addresses[0]
            }
            pageParams = { title: "Checkout", addresses: data.addresses, defaultAddress, product, itemsCount: quantity, totalPrice, productSize, allCoupons, walletAmount: walletAmount.balance }
        } else {
            pageParams = { title: "Checkout", product, itemsCount: quantity, totalPrice, productSize, allCoupons, walletAmount: walletAmount.balance }
        }

        res.render('./User/products/checkout', pageParams)
        res.end()
    }
    else {
        res.redirect('/')
    }
})

//change default address
const setDefaultAddress = asyncHandler(async (req, res) => {
    await userAddress.updateOne({ user: req.session._id }, { $set: { "addresses.$[elem].isDefault": false } }, { arrayFilters: [{ 'elem.isDefault': true }] })
        .then(() => console.log("changed all addresses to isDefault : false"))
        .catch((Err) => console.log(Err))

    await userAddress.updateOne({ user: req.session._id }, { $set: { "addresses.$[elem].isDefault": true } }, { arrayFilters: [{ 'elem._id': req.body.defaultAddress }] })
        .then(() => console.log("Default address changed"))
        .catch((err) => console.log("ERRor in changing default address", err))
    res.redirect('back')
})

//Confirm order
const confirmOrder = asyncHandler(async (req, res) => {
    console.log("Previous route : ", req.session.previousRoute)
    if (req.session.previousRoute == '/user/checkout' || req.session.previousRoute == '/user/checkOutOne' || req.session.previousRoute == '/user/payOnline') {
        console.log("ORder confirming.....")
        let orderDetails = []
        let ordernumber = generateOrderNumber()
        let totalPrice
        let itemsCount

        let address = await userAddress.findOne({ user: req.session._id }, { _id: 0, addresses: 1 })
        let shippingAddress = address.addresses.filter((item) => item.isDefault === true)
        if (shippingAddress === null || '' || undefined) {
            shippingAddress = address.addresses[0]
        }

        let pageParams
        //if the order is placed from the cart
        if (req.body.cartItems) {
            let cartProducts = await cart.findOne({ user: req.session._id }).populate('items.product').exec()
            let items = cartProducts.items
            itemsCount = cartProducts.items.length
            totalPrice = cartProducts.items.map((item) => item.cartPrice).reduce((accumulator, currentvalue) => accumulator + currentvalue, 0)
            console.log("items : ", items)

            items.forEach((item) => {
                orderDetails.push({
                    userId: req.session._id,
                    userName: req.session.user,
                    product: item.product,
                    productName: item.productName,
                    quantity: item.quantity,
                    productPrice: item.productPrice,
                    cartPrice: item.cartPrice,
                    orderNumber: ordernumber,
                    paymentMethod: req.body.paymentMethod,
                    paymentStatus: req.body.paymentStatus,
                    paymentId: req.body.paymentId,
                    shippingAddress: shippingAddress[0],
                    orderDate: new Date()
                })
            })

            //reducing quantity in the products collection
            items.forEach(async (item) => {
                await products.updateOne({ _id: item.product }, { $inc: { quantity: -item.quantity } })
            })
            //
            await orders.updateOne({ user: req.session._id }, { $push: { orders: orderDetails } }, { upsert: true })
                .then(async () => {
                    await cart.updateOne({ user: req.session._id }, { $set: { items: [] } })
                    pageParams = { title: "Shopvista || Order success", defaultAddress: shippingAddress[0], totalPrice, itemsCount, loggedIn: true }

                    //updating wallet
                    if (req.body.paymentMethod == 'Wallet payment') {
                        let ordersList = await orders.findOne({ user: req.session._id })
                        let allOrders = ordersList.orders.reverse()
                        for (let i = 0; i < itemsCount; i++) {
                            let currentOrder = allOrders[i]
                            console.log("latest order ", i, " ", currentOrder)
                            let data = {
                                orderId: currentOrder._id,
                                amount: currentOrder.cartPrice,
                                date: new Date()
                            }

                            await userWallet.updateOne({ userId: req.session._id }, { $inc: { balance: -currentOrder.cartPrice }, $push: { expense: data } })
                            await user.updateOne({ _id: req.session._id }, { $inc: { wallet: -currentOrder.cartPrice } })

                        }
                    }
                })
                .catch((err) => console.log("Failed to update order details :", err))
        }
        /////////////
        ///if the order is placed for a single product
        else if (req.body.productId) {
            let product = await products.findOne({ _id: req.body.productId })

            console.log("product : ", typeof product)
            let quantity = req.body.productQuantity
            orderDetails.push({
                userId: req.session._id,
                userName: req.session.user,
                product: product._id,
                productName: product.title,
                size: req.body.productSize,
                quantity: quantity,
                productPrice: product.salePrice,
                cartPrice: req.body.totalPrice,
                discount: req.body.discountPrice,
                couponUsed: req.body.appliedCoupon,
                orderNumber: ordernumber,
                paymentMethod: req.body.paymentMethod,
                paymentStatus: req.body.paymentStatus,
                paymentId: req.body.paymentId,
                shippingAddress: shippingAddress[0],
                orderDate: new Date()
            })
            console.log("Order details : ", orderDetails)

            //updating coupon
            console.log("req.body.appliedCoupon : ", req.body.appliedCoupon)
            if (req.body.appliedCoupon != '') {
                let couponId = await coupons.findOne({ couponName: req.body.appliedCoupon })
                console.log("couponFound : ", couponId)
                await user.updateOne({ _id: req.session._id }, { $pull: { coupons: couponId._id } })
                await coupons.updateOne({ couponName: req.body.appliedCoupon }, { $push: { usedBy: req.session._id } })
            }

            //updating changes in the products collection

            await products.updateOne({ _id: product._id }, { $inc: { quantity: -quantity } })

            console.log("Shipping address : ", shippingAddress[0])

            await orders.updateOne({ user: req.session._id }, { $push: { orders: orderDetails } }, { upsert: true })

            //updating wallet transaction
            if (req.body.paymentMethod == 'Wallet payment') {
                let ordersList = await orders.findOne({ user: req.session._id })
                let currentOrder = ordersList.orders.reverse()[0]
                console.log("current ORder : ", currentOrder)
                let data = {
                    orderId: currentOrder._id,
                    amount: currentOrder.cartPrice,
                    date: new Date()
                }
                await userWallet.updateOne({ userId: req.session._id }, { $inc: { balance: -currentOrder.cartPrice }, $push: { expense: data } })
                await user.updateOne({ _id: req.session._id }, { $inc: { wallet: -currentOrder.cartPrice } })
            }
            pageParams = { title: "Shopvista || Order success", defaultAddress: shippingAddress[0], totalPrice: req.body.totalPrice, itemsCount: quantity, loggedIn: true }

        }
        /////////

        res.render('./User/products/orderSuccess', pageParams)

    }
    else {
        res.redirect('/user/cart')
    }

    res.end()
})

//manage orders
const manageOrders = asyncHandler(async (req, res) => {
    let page = parseInt(req.params.page) || 1
    let perPage = 5
    let userOrders = await orders.findOne({ user: req.session._id }).populate('orders.product').exec()
    let orderedProducts
    let totalOrders
    let totalPages
    let skip
    let limit
    if (userOrders) {
        ////updatin totalPurchase field
        let deliveredOrders = userOrders.orders.filter((order) => order.orderStatus == 'Delivered')
        let totalAmount = deliveredOrders.reduce((sum, order) => sum + order.cartPrice, 0)
        await orders.updateOne({ user: req.session._id }, { $set: { totalPurchase: totalAmount } })
        /////

        orderedProducts = userOrders.orders.reverse()
        let len = orderedProducts.length
        for (let i = 0; i < len; i++) {
            if (orderedProducts[i].orderStatus == "Cancelled" || orderedProducts[i].orderStatus == "Delivered") {
                let order = orderedProducts.splice(i, 1)[0]
                orderedProducts.push(order)
                i--
                len--
            }
        }

        totalOrders = orderedProducts.length
        totalPages = Math.ceil(totalOrders / perPage)
        skip = (page - 1) * perPage
        limit = skip + perPage
        orderedProducts = orderedProducts.slice(skip, limit)
    }

    const userdata = await user.findOne({ _id: req.session._id })
    res.render('./User/manageOrders/listOrders', { title: "Manage Orders", loggedIn: true, orderedProducts, totalPages, currentPage: page, username: userdata.username, wallet: userdata.wallet })
    res.end()
})

//load details of each order
const orderDetails = asyncHandler(async (req, res) => {
    const orderId = req.query.orderId

    let userOrders = await orders.findOne({ user: req.session._id }).populate('orders.product').exec()

    let product = userOrders.orders.find((p) => p._id == orderId)

    let returns = await productReturn.find({ user: req.session._id })

    let returnOrder = returns.find((doc) => JSON.stringify(doc.order._id) == JSON.stringify(product._id))
    console.log("return Product : ", returnOrder)
    let shippingAddress = product.shippingAddress
    let orderDate = convertDateAndTime(product.orderDate)
    let updatedAt = convertDateAndTime(product.updatedAt)

    const userdata = await user.findOne({ _id: req.session._id })
    res.render('./User/manageOrders/orderDetails', { title: "Order details", address: shippingAddress, product, loggedIn: true, orderDate, updatedAt, returnOrder, username: userdata.username, wallet: userdata.wallet })
    res.end()
})

//invoice download
const getInvoice = asyncHandler(async (req, res) => {
    console.log("Invoice loading...");


    let product = JSON.parse(req.query.product);
    let shippingAddress = product.shippingAddress;
    let orderDate = convertDateAndTime(product.orderDate)

    const invoicePath = path.join(__dirname, '..', 'views/User/manageOrders/invoice.ejs');

    try {
        let renderedInvoice = await ejs.renderFile(invoicePath, { shippingAddress, product, orderDate });

        res.send(renderedInvoice);
    } catch (err) {
        console.log("Error rendering invoice :", err);
        res.status(500).send('Internal Server Error');
    }

    console.log("Invoice end.");
});

////refund amount to bank
const refundToBank = asyncHandler(async (req, res) => {
    let paymentId = req.body.paymentId
    let refundAmount = req.body.refundAmount * 100
    razorpay.payments.refund(paymentId, { amount: refundAmount }, (err, refund) => {
        if (err) {
            console.log("Refund ERROR : ", err)
            res.status(500).send({ errMsg: "Can not refund amount right now, try again later" })
        } else {
            console.log("refund :", refund)
            res.status(200).send(refund)
        }
    })
})

//add refund amount to wallet
const addToWallet = asyncHandler(async (req, res) => {
    let refundAmount = req.body.refundAmount

    let data = {
        amount: refundAmount,
        orderId: req.body.orderId,
        date: new Date(),
        description: req.body.description,
    }
    await userWallet.updateOne({ userId: req.session._id }, { $inc: { balance: refundAmount }, $push: { income: data },$pull:{expense:{orderId:req.body.orderId}} }, { upsert: true })

    await user.updateOne({ _id: req.session._id }, { $inc: { wallet: refundAmount } })
        .then(() => {
            res.status(200)
        })
        .catch((err) => {
            console.log(err)
            res.status(400)
        })
    res.send()
})

//cancel order
const cancelOrder = asyncHandler(async (req, res) => {
    let orderId = req.body.orderId
    let refundId = req.body.refundId
    let refundStatus = req.body.refundStatus
    console.log("refundId : ", refundId)
    console.log("refund Status : ", refundStatus)
    const update = { $set: { "orders.$[element].orderStatus": "Cancelled", "orders.$[element].updatedAt": new Date(), "orders.$[element].refundId": refundId, "orders.$[element].refundStatus": refundStatus } }
    const options = { arrayFilters: [{ "element._id": orderId }] }


    await orders.updateOne({ user: req.session._id }, update, options)
    let productId
    let stock
    let cancelOrder = await orders.findOne({ user: req.session._id })
    cancelOrder.orders.forEach((doc) => {
        if (doc._id == orderId) {
            productId = doc.product
            stock = doc.quantity
        }
    })

    await products.updateOne({ _id: productId }, { $inc: { quantity: stock } })
        .then(() => console.log("successfully updated product quantity"))
        .catch((err) => console.log("error in updating product quantity after cancellatation : ", err))

    res.redirect('back');
})

///request return order
const requestReturn = asyncHandler(async (req, res) => {
    let productId = req.body.productId
    let returnReason = req.body.returnReason
    let refundMethod = req.body.refundMethod

    let orderDetail = await orders.findOne({ "orders._id": req.body.orderId })
    let orderData = orderDetail.orders.find((doc) => doc._id == req.body.orderId)

    let data = {
        "user": req.session._id,
        "order": orderData,
        "product": productId,
        "returnReason": returnReason,
        "refundMethod": refundMethod
    }
    await productReturn.create(data)
        .then(() => {
            console.log("return request added to database")
            res.status(200).send()
        })
        .catch((err) => console.log("error in inserting product return data :", err))
})



////load wallet
const loadWallet = asyncHandler(async (req, res) => {
    let incomePage = parseInt(req.query.incomePage) || 1
    let expensePage = parseInt(req.query.expensePage) || 1
    let perPage = 5

    let wallet = await userWallet.findOne({ userId: req.session._id })

    let totalIncomePages = Math.ceil(wallet.income.length/perPage)
    let incomeSkip = (incomePage - 1) * perPage
    let incomeLimit = incomeSkip + perPage
    let income = wallet.income.slice(incomeSkip, incomeLimit)
    
    let totalExpensePages = Math.ceil(wallet.expense.length/perPage)
    let expenseSkip = (expensePage - 1) * perPage
    let expenseLimit = expenseSkip + perPage
    let expense = wallet.expense.slice(expenseSkip, expenseLimit)

    res.render('./User/wallet', { title: "My Wallet", wallet: wallet.balance, loggedIn: true, username: req.session.user, walletData: wallet, income, expense, totalExpensePages, totalIncomePages, currentIncomePage:incomePage, currentExpensePage:expensePage })
})





//User logout
const logoutUser = asyncHandler(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    req.session.user = null
    req.session._id = null
    res.redirect('/')
    res.end()
})



let orderCounter = 1


function generateOrderNumber() {
    const prefix = "ORDSHOPV";
    const currentDateTime = new Date();
    const formattedDateTime = currentDateTime.toISOString().replace(/\D/g, '').slice(0, 14);
    const randomness = Math.floor(Math.random() * 1000); // Adjust the range as needed
    const sequentialNumber = getSequentialNumber(); // Implement your own sequential number generation logic

    const orderNumber = `${prefix}${formattedDateTime}${randomness}${sequentialNumber}`;
    return orderNumber;
}


function getSequentialNumber() {
    const sequentialNumber = orderCounter.toString().padStart(6, '0');
    orderCounter++;
    return sequentialNumber;
}

function convertDateAndTime(dateString) {
    console.log("converting date string : ", dateString)
    let dateObject = new Date(dateString);

    // Convert to a custom date string format
    let options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    let day = dateObject.toLocaleString('en-US', options);

    // Convert time to Indian Standard Time (IST)
    options = { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZone: 'Asia/Kolkata' };
    let time = dateObject.toLocaleString('en-US', options);

    return { day, time }
}








module.exports = {
    loadHome,
    loadUserSignup,
    isExistingUser,
    insertUser,
    loadUserLogin,
    loadShop,
    loadOtpLogin,
    loadShopOtp,
    checkNumber,
    isUserBlocked,
    searchProducts,
    productDetails,
    rateProduct,
    addReview,
    loadProfile,
    updatePersonalInfo,
    loadCart,
    addToCart,
    removeFromCart,
    loadWishlist,
    removeFromWishlist,
    moveToWishlist,
    changeQuantity,
    manageAddress,
    addAddress,
    editAddress,
    removeAddress,
    onlinePayment,
    loadCheckout,
    checkOutForOne,
    setDefaultAddress,
    confirmOrder,
    manageOrders,
    orderDetails,
    getInvoice,
    refundToBank,
    addToWallet,
    cancelOrder,
    requestReturn,
    loadWallet,
    logoutUser
}
