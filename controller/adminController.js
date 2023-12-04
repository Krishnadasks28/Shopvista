const asyncHandler = require('express-async-handler')
const { category, products, user, orders, coupons, productReturn, userWallet, banner } = require('../database/mongodb')
const { upload } = require('../database/uploads')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { default: mongoose } = require('mongoose')
const ejs = require('ejs')
const excel = require('exceljs')
const Razorpay = require('razorpay')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY
})


//load admin login
const loadAdminLogin = asyncHandler(async (req, res) => {
    res.render('./admin/pages/login', { title: "Admin Log In" })
})

//load admin panel
const adminPanel = asyncHandler(async (req, res) => {

    if (req.body.email === process.env.ADMIN_EMAIL && req.body.password === process.env.ADMIN_PASSWORD) {
        req.session.admin = req.body.email
        res.redirect('/admin/dashboard')
    }
    else if (req.body.email !== process.env.ADMIN_EMAIL) {
        res.render('./admin/pages/login', { title: "Admin Login", errMsg: "Invalid Email!" })
        res.end()
    }
    else if (req.body.password !== process.env.ADMIN_PASSWORD) {
        res.render('./admin/pages/login', { title: "Admin Login", errMsg: "Incorrect Password!" })
        res.end()
    }
})

//load dashboard
const loadDashBoard = asyncHandler(async (req, res) => {
    let allOrders = await orders.find({})
    let ordersList = allOrders.map((order) => order.orders)
    ordersList = [].concat(...ordersList)
    let totalOrders = ordersList.length

    let totalSales = allOrders.reduce((sum, order) => sum + order.totalPurchase, 0)

    let allProducts = await products.find({})
    let totalProducts = allProducts.length

    let allUsers = await user.find({})
    let totalUsers = allUsers.length

    ///chart Data
    let salesData
    let chartData = []
    let label
    let year = new Date().getFullYear()
    let day = 0
    let Month

    ///filtering data in weeks of a month
    if (req.query.month && req.query.year) {

        let month = parseInt(req.query.month)
        year = parseInt(req.query.year)

        ///
        Month = convertDateAndTime(new Date(year, month)).day
        Month = Month.split(' ')[1]
        //
        salesData = await orders.aggregate([
            { $unwind: "$orders" },
            {
                $match: {
                    "orders.orderStatus": "Delivered",
                    "orders.deliverDate.dateString": {
                        $gte: new Date(year, month, 1),///first day of the month
                        $lte: new Date(year, month, 31)
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $floor: {
                            $divide: [
                                { $subtract: ["$orders.deliverDate.dateString", new Date(year, month, 1)] }, // Difference in milliseconds
                                604800000 // Milliseconds in a week (7 days)
                            ]
                        }
                    },
                    totalPurchase: { $sum: "$orders.cartPrice" }
                }
            }
        ])

        label = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"]
        console.log("SalesData : ", salesData)
    }
    else if (req.query.year) {////filtering data in months in a year
        day = 1
        year = parseInt(req.query.year)
        salesData = await orders.aggregate([
            { $unwind: "$orders" },
            {
                $match: {
                    "orders.orderStatus": "Delivered",
                    $expr: {
                        $eq: [
                            { $year: "$orders.deliverDate.dateString" },
                            year
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$orders.deliverDate.dateString" },
                    totalPurchase: { $sum: "$orders.cartPrice" }
                }
            }
        ])
        label = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

    }
    else {////sales data in the current week
        let today = new Date()
        salesData = await orders.aggregate([
            { $unwind: "$orders" },
            {
                $match: {
                    "orders.orderDate": { $exists: true },
                    "orders.orderStatus": "Delivered",
                    "orders.deliverDate.dateString": {
                        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getUTCDay()),///first day of the week
                        $lte: today
                    }
                }
            },
            {
                $group: {
                    _id: "$orders.deliverDate.dayOfWeek",
                    totalPurchase: { $sum: "$orders.cartPrice" }

                }
            }, {
                $project: {
                    _id: 1,
                    totalPurchase: 1
                }
            },
            { $sort: { "_id": 1 } }
        ])
        label = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    }

    for (let i = 0; i < label.length; i++) {
        let flag = false
        for (let j = 0; j < salesData.length; j++) {
            if (salesData[j]._id == i + day) {
                chartData[i] = salesData[j].totalPurchase
                flag = true
                break;
            }
        }

        if (flag == false) {
            chartData[i] = 0
        }

    }
    console.log("Sales for the year : ", salesData)
    console.log("chartData : ", chartData)


    //////
    let topProducts = await products.find({}).sort({ sold: -1 }).limit(2).populate('categoryName')


    res.render('./admin/pages/dashboard', { title: "Admin Panel", totalSales, totalOrders, totalProducts, totalUsers, year, month: Month, chartData: JSON.stringify(chartData), label, topProducts })
    res.end()
})

//category management
const manageCategory = asyncHandler(async (req, res) => {
    let perPage = 5
    let page = parseInt(req.params.page) || 1
    let categories = await category.find({}).skip((page - 1) * perPage).limit(perPage).exec()
    console.log("categoriess", categories)
    let totalCategories = await category.countDocuments({})
    let totalPages = Math.ceil(totalCategories / perPage)

    res.render('./admin/pages/category/manageCategory', { title: "Category Management", categories, totalPages, currentPage: page })
    res.end()
})

///Search and find category
const searchCategory = asyncHandler(async (req, res) => {
    let textQuery = req.query.search
    let categories = await category.find({ $text: { $search: textQuery } })
    res.render('./admin/pages/category/manageCategory', { title: "Category Management", categories })
    res.end()
})

//Add new category
const addCategory = asyncHandler(async (req, res) => {
    res.render('./admin/pages/category/addCategory', { title: "Add Category" })
    res.end()
})

const insertCategory = asyncHandler(async (req, res) => {
    const existingCategory = await category.findOne({ "category_name": { $regex: new RegExp(req.body.addCategory, "i") } });
    console.log(existingCategory)
    if (existingCategory) {
        res.render('./admin/pages/category/addCategory', { title: "Category Management", alert: "This category already exists" })
        res.end()
    }
    else {
        let data = {
            "category_name": req.body.addCategory,
            "category_description": req.body.discription,
            "isListed": req.body.islisted
        }
        await category.create(data)
            .then(() => console.log("Category added successfully"))
            .catch((err) => console.log(err, "Failed to add category"))

        res.redirect('/admin/manageCategory/1')
    }
})

//Edit category
const editCategory = asyncHandler(async (req, res) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    var cat = await category.findOne({ "_id": req.params.id })
    console.log(cat)
    res.render('./admin/pages/category/editCategory', { title: "Edit Category", cat })
})

//update category changes
const updateCategory = asyncHandler(async (req, res) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (req.body.updatedName && req.body.updatedDiscription) {
        await category.updateOne({ _id: req.params.id }, { $set: { category_name: req.body.updatedName, category_description: req.body.updatedDiscription } })
    }
    else if (req.body.updatedName) {
        await category.updateOne({ _id: req.params.id }, { $set: { category_name: req.body.updatedName } })
    }
    else if (req.body.updatedDiscription) {
        await category.updateOne({ _id: req.params.id }, { $set: { category_description: req.body.updatedDiscription } })
    }
    else {
        res.render('./admin/pages/category/editCategory', { title: "Edit Category", alert: "No changes made." })
    }

    if (req.body.updatedName || req.body.updatedDiscription) {
        let cat = await category.findOne({ _id: req.params.id })
        console.log(cat)
        res.redirect('/admin/manageCategory/1')
    }
})

//list and unlist categories
const listCategory = asyncHandler(async (req, res) => {
    await category.updateOne({ _id: req.params.id }, { $set: { isListed: true } })
    res.redirect('back')
})

const unlistCategory = asyncHandler(async (req, res) => {
    await category.updateOne({ _id: req.params.id }, { $set: { isListed: false } })
    res.redirect('back')
})

//delete category 
const deleteCategory = asyncHandler(async (req, res) => {
    await category.findByIdAndRemove(req.params.id)
        .then(() => console.log("Category deleted"))
        .catch((err) => console.log(err, "Failed to delete category"))
    res.redirect('back')
})

//product management
const manageProducts = asyncHandler(async (req, res) => {
    let perPage = 4
    let page = parseInt(req.params.page) || 1
    let productList = await products.find({}).populate('categoryName').skip((page - 1) * perPage).limit(perPage).sort({ createdAt: -1 }).exec()

    let totalProducts = await products.countDocuments({})
    let totalPages = Math.ceil(totalProducts / perPage)
    res.render('./admin/pages/products/manageProducts', { title: "Product Management", productList, totalPages, currentPage: page })
})

//search products
const searchProducts = asyncHandler(async (req, res) => {
    let searchQuery = req.query.search
    let productList = await products.find({ $text: { $search: searchQuery } })
    res.render('./admin/pages/products/manageProducts', { title: "Product Management", productList })
    res.end()
})

//Add product
const addProduct = asyncHandler(async (req, res) => {
    let catList = await category.find({ isListed: true })
    res.render('./admin/pages/products/addProduct', { title: "Add New Product", catList })
    res.end()
})


// cropImages 
const cropImages = asyncHandler(async (images) => {
    const croppedImages = []
    for (const image of images) {
        // const outputPath = `${image.path}`
        // await sharp(image.path)
        //     .resize(500, 650, { fit: "cover" })
        //     .toFile(outputPath)
        //     .catch((err) => {
        //         console.log("Error croping image", err)
        //     })

        croppedImages.push({
            name: image.filename,
            path: image.path
        })
    }

    return croppedImages;
})

//upload images
const imageUpload = upload.fields([
    { name: "secondaryImage" }])

const primaryImageUpload = upload.single('primaryImage')

const primaryCroppedImageUpload = asyncHandler(async (req, res) => {
    const primaryImage = req.file; // The uploaded image is available here

    req.session.primaryImage = primaryImage
    console.log("PRimary Image :", primaryImage)

    // Send a response to the client
    res.json({ message: 'Primary image uploaded successfully' })
    res.end()
});

//upload product data    
const insertProduct = asyncHandler(async (req, res) => {

    let newFilePath = req.session.primaryImage.path + req.body.imageName

    fs.rename(req.session.primaryImage.path, newFilePath, (err) => console.log(err))

    let primaryImage = {
        name: req.session.primaryImage.originalname,
        path: newFilePath
    }

    let secondaryImages = await cropImages(req.files.secondaryImage)
    console.log("Primary image upload", primaryImage)

    let categoryId = await category.findOne({ "category_name": req.body.categoryName })
    console.log("Category : ", categoryId)
    let product = {
        title: req.body.title,
        brand: req.body.brand,
        color: req.body.color,
        size: req.body.size || [],
        description: req.body.description,
        categoryName: categoryId._id,
        quantity: req.body.quantity,
        productPrice: req.body.productPrice,
        salePrice: req.body.salePrice,
        primaryImage: primaryImage,
        secondaryImages: secondaryImages,
    }

    await products.create(product)
        .then(() => console.log("Product added to database"))
        .catch((err) => console.log(err, "Failed to add product"))
    res.redirect('/admin/manageProducts/1')
})

//edit product
const editProduct = asyncHandler(async (req, res) => {
    console.log("Edit Product")
    let catList = await category.find({ isListed: true })
    let product = await products.findById(req.params.id).populate('categoryName').exec()
    res.render('./admin/pages/products/editProducts', { title: "Edit product", product, catList })
    res.end()
})

//update product after editing
const updateProduct = asyncHandler(async (req, res) => {
    const existingProduct = await products.findById(req.params.id);
    let primaryImage
    // Handle primary image

    if (req.body.imageName != '') {
        console.log("ImageName :", req.body.imageName)
        let newFilePath = req.session.primaryImage.path + req.body.imageName

        fs.rename(req.session.primaryImage.path, newFilePath, (err) => console.log(err))

        primaryImage = {
            name: req.session.primaryImage.originalname,
            path: newFilePath
        }

    } else {
        primaryImage = existingProduct.primaryImage[0]
        console.log("no change :", primaryImage)
    }

    // Handle secondary images
    const secondaryImageIDs = req.body.idSecondaryImage; /* hidden input image id */
    const secondaryImages = req.files.secondaryImage;
    console.log("Req.files.secondaryImages : ", req.files.secondaryImage)
    const dbImages = existingProduct.secondaryImages;
    if (secondaryImages) {
        for (let i = 0; i < secondaryImages.length; i++) {



            let image = {
                name: secondaryImages[i].filename,
                path: secondaryImages[i].path
            }

            dbImages.push(image)

        }
    }
    console.log("Db images : ", dbImages)

    // Save the updated product back to the database
    existingProduct.primaryImage = primaryImage;
    existingProduct.secondaryImages = dbImages;
    await existingProduct.save();
    let categoryId = await category.findOne({ "category_name": req.body.categoryName })

    const editingProduct = {
        title: req.body.title,
        description: req.body.description,
        brand: req.body.brand,
        color: req.body.color,
        size: req.body.size,
        categoryName: categoryId._id,
        quantity: req.body.quantity,
        productPrice: req.body.productPrice,
        salePrice: req.body.salePrice,
        primaryImage: [primaryImage] // Include other fields you want to update

    };

    const updatedProduct = await products.findByIdAndUpdate(req.params.id, editingProduct, { new: true });
    console.log('updated product', updatedProduct);

    res.redirect('/admin/manageProducts/1');
})


//Delete product
const deleteProduct = asyncHandler(async (req, res) => {
    let product = await products.findOne({ _id: req.params.id })
    let imagePath = product.primaryImage[0].path
    let secondaryImages = await products.findOne({ _id: req.params.id }, { _id: 0, secondaryImages: 1 })
    console.log(secondaryImages)
    console.log(imagePath)
    if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('Primary image deleted')
    } else {
        console.log("Primary image not found")
    }
    let images = secondaryImages.secondaryImages
    images.forEach((image) => {
        let path = image.path
        if (fs.existsSync(path)) {
            fs.unlinkSync(path);
            console.log('secondary images deleted')
        } else {
            console.log("secondary images not found")
        }
    });
    await products.findByIdAndRemove(req.params.id)
    res.redirect('back')
})

//list and unlist products
const listProduct = asyncHandler(async (req, res) => {
    await products.updateOne({ _id: req.params.id }, { $set: { isListed: true } })
    res.redirect('back')
})

const unlistProduct = asyncHandler(async (req, res) => {
    await products.updateOne({ _id: req.params.id }, { $set: { isListed: false } })
    res.redirect('back')
})

//Manage users
const manageUsers = asyncHandler(async (req, res) => {
    let page = parseInt(req.params.page) || 1
    let perPage = 5
    let users = await user.find({}).skip((page - 1) * perPage).limit(perPage)
    let totalUsers = await user.countDocuments({})

    let totalPages = Math.ceil(totalUsers / perPage)
    res.render('./admin/pages/user/manageUsers', { title: "Manage Users", users, totalPages, currentPage: page })
    res.end()
})

//Block and unblock users
const unblockUSer = asyncHandler(async (req, res) => {
    await user.updateOne({ _id: req.body.userId }, { $set: { isBlocked: false } })
        .then(() => {
            res.status(200).send()
        })
        .catch((err) => {
            res.status(400).send()
        })
})

const blockUser = asyncHandler(async (req, res) => {
    console.log("userID : ", req.body.userId)

    try {
        await user.updateOne({ _id: req.body.userId }, { $set: { isBlocked: true } })

        res.status(200).send()
    } catch (err) {
        console.log(err)
        res.status(400).send()
    }
})

//Delete secondaryImages of product
const deleteImage = asyncHandler(async (req, res) => {
    let secondaryImages = await products.findOne({ _id: req.params.productId }, { _id: 0, secondaryImages: 1 })
    let secondImages = secondaryImages.secondaryImages
    let imageToDelete = req.params.imageName

    const updatedImages = secondImages.filter(
        (image) => image.name !== imageToDelete
    );

    await products.updateOne({ _id: req.params.productId }, { $set: { secondaryImages: updatedImages } })
        .then(() => res.redirect('back'))
        .catch((err) => {
            console.log(err).send("image deleted")
            res.status(400).send("invalid request")
        })
})


//Order management
const manageOrders = asyncHandler(async (req, res) => {
    let perPage = 5
    let page = parseInt(req.params.page) || 1
    let ordersList = await orders.find({}).populate('orders.product')
    let allOrders = []
    ordersList.forEach(async (order) => {
        allOrders.push(order.orders)

        ///updating totalPurcahse field
        let deliveredOrders = order.orders.filter((order) => order.orderStatus == 'Delivered')
        let totalAmount = deliveredOrders.reduce((sum, order) => sum + order.cartPrice, 0)
        console.log('order.user : ', order.user, typeof order.user)
        console.log("total amout : ", totalAmount)
        await orders.updateOne({ user: order.user }, { $set: { totalPurchase: totalAmount } })
        ////
    })
    console.log("all orders : ", allOrders)
    let totalOrders = allOrders.reduce((sum, order) => sum + order.length, 0)
    let totalPages = Math.ceil(totalOrders / perPage)

    let skip = (page - 1) * perPage
    let limit = skip + perPage
    let ordersFiltered = [].concat(...allOrders)
    ordersFiltered.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
    ordersFiltered = ordersFiltered.slice(skip, limit)
    console.log("Filtered products : ", ordersFiltered)

    res.render('./admin/pages/orders/manageOrders', { title: "Order Management", allOrders: ordersFiltered, totalPages, currentPage: page })
    res.end()
})

//search orders
const searchOrder = asyncHandler(async (req, res) => {
    let searchQuery = req.query.search
    let order = await orders.find({ $text: { $search: searchQuery } })
    res.render('./admin/pages/orders/manageOrders', { title: "Order Management", allOrders: order })
    res.end()
})

const updateOrder = asyncHandler(async (req, res) => {
    let orderId = req.query.orderId
    let order = await orders.find({ "orders._id": orderId }).populate('orders.product').populate('orders.userId').populate({ path: 'orders.product', populate: { path: 'categoryName', model: 'category' } })
    console.log("Editing order : ", order)
    order = order[0].orders.find((product) => product._id == orderId)
    console.log("Editing order : ", order)

    res.render('./admin/pages/orders/updateOrder', { title: "Update Order", order })
    res.end()
})

const updateOrderChanges = asyncHandler(async (req, res) => {

    const update = {
        $set: {
            "orders.$[element].paymentStatus": req.body.paymentStatus,
            "orders.$[element].shippingStatus": req.body.shippingStatus,
            "orders.$[element].orderStatus": req.body.orderStatus,
        }
    }
    const options = { arrayFilters: [{ "element._id": req.body.orderId }] }

    ///incrementing the count of sale of this product
    if (req.body.orderStatus == 'Delivered') {
        let order = await orders.findOne({ "orders._id": req.body.orderId })
        let deliverDate = convertDateAndTime(new Date())
        await orders.updateOne({ "orders._id": req.body.orderId }, { $set: { "orders.$[element].deliverDate": deliverDate } }, options, { upsert: true });
        console.log("currentOrder : ", order)
        let product = order.orders.find((order) => {
            if (order._id == req.body.orderId) {
                console.log("product Id : ", order.product)
                return order
            }
        })
        let productId = product.product
        console.log("product : ", productId)
        await products.updateOne({ _id: productId }, { $inc: { sold: product.quantity, totalSale: product.cartPrice } })
    }
    //////


    await orders.updateOne({ "orders._id": req.body.orderId }, update, options)
    res.redirect('back')
})

//Manage Coupons
const manageCoupons = asyncHandler(async (req, res) => {
    let page = parseInt(req.params.page) || 1
    let perPage = 5
    let allCoupons = await coupons.find({}).skip((page - 1) * perPage).limit(perPage)
    let totalCoupons = await coupons.countDocuments({})
    console.log("total Coupons : ", totalCoupons)
    let totalPages = Math.ceil(totalCoupons / perPage)
    console.log("total Pages : ", totalPages)
    allCoupons.forEach((coupon) => {
        coupon.expiredOn = convertDateAndTime(coupon.expiryDate)
    })
    console.log("coupons : ", allCoupons)
    res.render('./admin/pages/coupons/manageCoupons', { title: "Coupon Management", coupons: allCoupons, totalPages, currentPage: page })
    res.end()
})

const addCoupon = asyncHandler(async (req, res) => {
    res.render('./admin/pages/coupons/addCoupon', { title: "Add New Coupon" })
    res.end()
})

const insertCoupon = asyncHandler(async (req, res) => {
    await coupons.create(req.body)
    res.render('./admin/pages/coupons/addCoupon', { title: "Add New Coupon", alert: 'New coupon ' + req.body.couponName + ' added.' })
    res.end()

})


const loadSalesReport = asyncHandler(async (req, res) => {
    let perPage = 3
    let page = parseInt(req.params.page) || 1
    let allOrders = await orders.find({}).populate('user').populate('orders.product').populate({ path: 'orders.product', populate: { path: 'categoryName', model: 'category' } }).exec();

    let ordersList = []

    allOrders.forEach((orders) => {
        orders.orders.forEach((order) => {
            if (order.deliverDate) {
                ordersList.push(order)
            }
        })

    })
    ordersList = [].concat(...ordersList)
    let totalOrders = ordersList.length
    let totalPages = Math.ceil(totalOrders / perPage)
    let skip = (page - 1) * perPage
    let limit = skip + perPage
    ordersList = ordersList.slice(skip, limit)
    console.log("ordersList : ", ordersList)

    let allProducts = await products.find({})
    let allCategories = await category.find({})

    res.render('./admin/pages/salesReport', { title: "Sales report", ordersList, salesData: JSON.stringify(ordersList), totalPages, currentPage: page, allProducts, allCategories })
    res.end()
})

const filterSales = asyncHandler(async (req, res) => {
    let perPage = 3
    let page = parseInt(req.params.page) || 1

    let allOrders = await orders.find({}).populate('user').populate('orders.product').populate({ path: 'orders.product', populate: { path: 'categoryName', model: 'category' } }).exec();
    let ordersList = []
    if (req.query.fromDate && req.query.toDate) {
        let fromDate = new Date(req.query.fromDate).toISOString().split('T')[0]
        let toDate = new Date(req.query.toDate).toISOString().split('T')[0]
        allOrders.forEach((orders) => {
            orders.orders.forEach((order) => {
                if (order.deliverDate) {
                    let deliverDate = order.deliverDate.dateString.toISOString().split('T')[0]
                    if (deliverDate <= toDate && deliverDate >= fromDate) {
                        ordersList.push(order)
                    }

                }
            })
        })
    }
    else if (req.query.payment) {
        let paymentMethod = req.query.payment
        allOrders.forEach((orders) => {
            orders.orders.forEach((order) => {
                if (order.deliverDate && paymentMethod == order.paymentMethod) {
                    ordersList.push(order)
                }
            })
        })

    }
    else if (req.query.categoryId) {
        let categoryId = new mongoose.Types.ObjectId(req.query.categoryId)
        console.log("categoryId : ", categoryId, typeof categoryId)
        allOrders.forEach((orders) => {
            orders.orders.forEach((order) => {
                console.log("order.product.categoryName._id : ", order.product.categoryName._id, typeof order.product.categoryName._id)
                if (order.deliverDate && order.product.categoryName._id.equals(categoryId)) {
                    console.log("condition true")
                    ordersList.push(order)
                }
            })
        })
    }
    else if (req.query.productId) {
        let productId = new mongoose.Types.ObjectId(req.query.productId)
        console.log("productId : ", productId, typeof productId)
        allOrders.forEach((orders) => {
            orders.orders.forEach((order) => {
                console.log("order.product._id : ", order.product._id, typeof order.product._id)
                if (order.deliverDate && order.product._id.equals(productId)) {
                    console.log("condition true")
                    ordersList.push(order)
                }
            })
        })
    }

    ordersList = [].concat(...ordersList)
    let totalOrders = ordersList.length
    let totalPages = Math.ceil(totalOrders / perPage)
    let skip = (page - 1) * perPage
    let limit = skip + perPage
    ordersList = ordersList.slice(skip, limit)
    console.log("ordersList : ", ordersList)
    let allProducts = await products.find({})
    let allCategories = await category.find({})

    res.render('./admin/pages/salesReport', { title: "Sales report", ordersList, salesData: JSON.stringify(ordersList), totalPages, currentPage: page, allProducts, allCategories })
    res.end()
})


///download sales report in pdf
const downloadSalesPdf = asyncHandler(async (req, res) => {
    let ordersList = JSON.parse(req.query.ordersList)
    console.log("ordersList : ", ordersList)
    let admin = req.session.admin
    let totalAmount = ordersList.reduce((sum, item) => item.cartPrice + sum, 0)
    let templatePath = path.join(__dirname, '..', 'views/admin/pages/salesReport/downloadPdf.ejs')

    try {
        let renderDownload = await ejs.renderFile(templatePath, { ordersList, admin, totalAmount })
        res.send(renderDownload)
    }
    catch (err) {
        console.log("Error rendering invoice :", err);
        res.status(500).send('Internal Server Error');
    }
})

///download sales report in Excel
const downloadSalesExcel = asyncHandler(async (req, res) => {
    let ordersList = JSON.parse(req.query.ordersList)

    const workbook = new excel.Workbook()
    const worksheet = workbook.addWorksheet('Orders')

    const headers = ['userName', '_id', 'productName', 'quantity', 'productPrice', 'orderDate', 'paymentMethod', 'deliverDate']
    worksheet.addRow(headers)

    ordersList.forEach((order) => {
        const rowData = headers.map((header) => order[header])
        worksheet.addRow(rowData)
    })


    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');

    workbook.xlsx.write(res).then(() => {
        res.end();
    });
})

///mange order returns
const manageReturns = asyncHandler(async (req, res) => {
    let returnOrders = await productReturn.find({ returnStatus: "Request Processing" }).populate('user').populate('product')
    res.render('./admin/pages/orderReturn/returnManagement', { title: "Mange Returns", returnOrders })
})

///order return request accept or decline
const orderReturnAction = asyncHandler(async (req, res) => {
    let returnId = req.body.returnId
    let returnStatus = req.body.returnStatus

    let returnOrder = await productReturn.findOne({ _id: returnId }).populate('order')
    let userId = returnOrder.user
    let refundAmount = returnOrder.order.cartPrice
    let orderId = returnOrder.order._id
    const options = { arrayFilters: [{ "element._id": orderId }] }
    let update
    let refundStatus
    console.log("refundAmount :", refundAmount)

    if (returnStatus == "Accepted") {
        refundStatus = "Processed"
        if (returnOrder.refundMethod == "addToBank") {
            let paymentId = returnOrder.order.paymentId
            refundAmount = refundAmount * 100
            razorpay.payments.refund(paymentId, { amount: refundAmount }, async (err, refund) => {
                if (err) {
                    console.log("Refund ERROR : ", err)
                } else {
                    console.log("refund success :", refund)
                    update = { $set: { "orders.$[element].orderStatus": "Return Processed", "orders.$[element].updatedAt": new Date(), "orders.$[element].refundId": refund.id, "orders.$[element].refundStatus": refund.status } }
                    await orders.updateOne({ user: userId }, update, options)
                }
            })
        }
        else if (returnOrder.refundMethod == "addToWallet") {
            await user.updateOne({ _id: userId }, { $inc: { wallet: refundAmount } })
                .then(async () => {
                    update = { $set: { "orders.$[element].orderStatus": "Return Processed", "orders.$[element].updatedAt": new Date(), "orders.$[element].refundStatus": "Processing" } }
                    await orders.updateOne({ user: userId }, update, options)
                })
                .catch((err) => {
                    console.log("Error in updating wallet of the user :", userId, err)
                })
            await userWallet.updateOne({ userId: userId }, { $inc: { balance: refundAmount }, $push: { income: { amount: refundAmount, orderId: orderId, date: new Date(), description: "Amount from order return." } } })

        }
    }

    await productReturn.updateOne({ _id: returnId }, { $set: { returnStatus: returnStatus, refundStatus: refundStatus } })
    res.redirect('back')
})

const loadBanners = asyncHandler(async (req, res) => {
    let banners = await banner.find({})
    console.log("banners : ", banners)
    res.render('./admin/pages/banner/manageBanners', { title: "Manage Banners", banners })
})

const addBanner = asyncHandler(async (req, res) => {
    res.render('./admin/pages/banner/addBanner', { title: 'Add new banner' })
})



const uploadBannerImage = asyncHandler(async (req, res) => {
    const bannerImage = req.file; // The uploaded image is available here

    req.session.bannerImage = bannerImage
    console.log("banner Image :", bannerImage)

    // Send a response to the client
    res.json({ message: 'Banner image uploaded successfully' })
    res.end()
})

const insertNewBanner = asyncHandler(async (req, res) => {
    console.log("Image Name : ", req.body.imageName)
    let newFilePath = req.session.bannerImage.path + req.body.imageName

    fs.rename(req.session.bannerImage.path, newFilePath, () => console.log("Sucess"))

    let bannerImage = {
        name: req.body.imageName,
        path: newFilePath
    }

    let data = {
        title: req.body.bannerTitle,
        image: bannerImage,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        bannerUrl: newFilePath,
        status: req.body.bannerStatus
    }

    await banner.create(data)
        .then(() => console.log("Banner added to collection."))
        .catch((err) => console.log("Error in uploading banner : ", err))
    console.log("banner.req.body :", req.body)
    res.redirect('/admin/manageBanner')
})

///delete banner
const deleteBanner = asyncHandler(async (req, res) => {
    let bannerId = req.body.bannerId
    let bannerName = await banner.findOne({ _id: bannerId }).title
    await banner.findByIdAndRemove({ _id: bannerId })
        .then(() => {
            res.status(200).send({ bannerName: bannerName })
        })
        .catch((err) => {
            console.log("Error in deleting banner :", err)
            res.status(400).send()
        })
})

//edit banner
const editBanner = asyncHandler(async (req, res) => {
    let bannerId = req.query.bannerId
    let currentBanner = await banner.findOne({ _id: bannerId })
    res.render('./admin/pages/banner/editBanner', { title: "Edit banner", currentBanner })
})

const updateBanner = asyncHandler(async (req, res) => {
    let bannerId = req.query.bannerId
    let existingBanner = await banner.findOne({ _id: bannerId })
    let filePath = existingBanner.bannerUrl
    let bannerImage = existingBanner.image
    if (req.body.imageName != '') {
        filePath = req.session.bannerImage.path + req.body.imageName

        fs.rename(req.session.bannerImage.path, filePath, () => console.log("Sucess"))

        bannerImage = {
            name: req.body.imageName,
            path: filePath
        }
    }

    let data = {
        title: req.body.bannerTitle,
        image: bannerImage,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        bannerUrl: filePath,
        status: req.body.bannerStatus
    }

    await banner.updateOne({_id:bannerId},{$set:data})
    .then(()=>console.log("Banner updated successfully."))
    .catch((err)=>console.log("Error in updatinf banner."))

    res.redirect('/admin/manageBanner')
})


///functions
function convertDateAndTime(dateString) {
    console.log("converting date string : ", dateString)
    let dateObject = new Date(dateString);

    let dayOfWeek = dateObject.getDay()
    // Convert to a custom date string format
    let options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    let day = dateObject.toLocaleString('en-US', options);

    // Convert time to Indian Standard Time (IST)
    options = { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZone: 'Asia/Kolkata' };
    let time = dateObject.toLocaleString('en-US', options);

    return { day, time, dayOfWeek, dateString }
}



module.exports = {
    loadAdminLogin,
    adminPanel,
    loadDashBoard,
    manageCategory,
    searchCategory,
    addCategory,
    insertCategory,
    editCategory,
    updateCategory,
    listCategory,
    unlistCategory,
    deleteCategory,
    manageProducts,
    searchProducts,
    addProduct,
    primaryImageUpload,
    primaryCroppedImageUpload,
    imageUpload,
    insertProduct,
    editProduct,
    updateProduct,
    deleteProduct,
    listProduct,
    unlistProduct,
    manageUsers,
    unblockUSer,
    blockUser,
    deleteImage,
    manageOrders,
    searchOrder,
    updateOrder,
    updateOrderChanges,
    manageCoupons,
    addCoupon,
    insertCoupon,
    loadSalesReport,
    filterSales,
    downloadSalesPdf,
    downloadSalesExcel,
    manageReturns,
    orderReturnAction,
    loadBanners,
    addBanner,
    uploadBannerImage,
    insertNewBanner,
    deleteBanner,
    editBanner,
    updateBanner
}