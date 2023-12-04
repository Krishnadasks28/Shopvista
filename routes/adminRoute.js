const express = require('express')
const router = express.Router()
const {isAdminLoggedIn,isAdminLoggedOut} = require('../middileware/adminAuth')
const adminController = require('../controller/adminController')
const { upload } = require('../database/uploads')



//Admin login
router.get('/login',isAdminLoggedOut, adminController.loadAdminLogin)
router.post('/login', adminController.adminPanel)

//Admin dashboard
router.get('/dashboard',isAdminLoggedIn, adminController.loadDashBoard)

//Category management
router.get('/manageCategory/:page',isAdminLoggedIn,adminController.manageCategory)

//search category
router.get('/categorySearch',isAdminLoggedIn,adminController.searchCategory)

//Add new category
router.get('/addCategory',isAdminLoggedIn, adminController.addCategory)
router.post('/addCategory',isAdminLoggedIn, adminController.insertCategory)

//Edit category
router.get('/editCategory/:id',isAdminLoggedIn, adminController.editCategory)

//update category
router.post('/editCategory/:id',isAdminLoggedIn, adminController.updateCategory)

//changes status of category(list)
router.post('/listCategory/:id',isAdminLoggedIn,adminController.listCategory)

//changes status of category(unlist)
router.post('/unlistCategory/:id',isAdminLoggedIn, adminController.unlistCategory)

//delete category
router.post('/deleteCategory/:id',isAdminLoggedIn,adminController.deleteCategory)

// Product Management
router.get('/manageProducts/:page',isAdminLoggedIn, adminController.manageProducts)

//search products
router.get('/searchProduct',isAdminLoggedIn,adminController.searchProducts)

//Add product
router.get('/addProduct',isAdminLoggedIn,adminController.addProduct)

//upload croppedImage
router.post('/uploadImageCropped',adminController.primaryImageUpload, adminController.primaryCroppedImageUpload)

router.post('/addProduct',isAdminLoggedIn,adminController.imageUpload,adminController.insertProduct)

//edit products
router.get('/editProduct/:id',isAdminLoggedIn,adminController.editProduct)

//update Products
router.post('/editProduct/:id',isAdminLoggedIn,adminController.imageUpload, adminController.updateProduct)

// Delete Product
router.post('/deleteProduct/:id',isAdminLoggedIn, adminController.deleteProduct)

// list and unlist products 
router.post('/listProduct/:id',isAdminLoggedIn, adminController.listProduct)
router.post('/unlistProduct/:id',isAdminLoggedIn, adminController.unlistProduct)

// User management
router.get('/manageUsers/:page',isAdminLoggedIn, adminController.manageUsers)

//unblock user
router.post('/unblockUser',isAdminLoggedIn, adminController.unblockUSer)

//block user
router.post('/blockUser',isAdminLoggedIn, adminController.blockUser)

//delete secondary images one by one
router.post('/deleteImage/:productId/:imageName',isAdminLoggedIn , adminController.deleteImage)

//order management
router.get('/manageOrders/:page',isAdminLoggedIn,adminController.manageOrders)

//search for order
router.get('/searchOrder',isAdminLoggedIn,adminController.searchOrder)

router.get('/updateOrder',isAdminLoggedIn,adminController.updateOrder)

router.post('/updateOrderChanges',isAdminLoggedIn,adminController.updateOrderChanges)

//Manage Coupons
router.get('/manageCoupons/:page',isAdminLoggedIn,adminController.manageCoupons)

router.get('/addCoupon',isAdminLoggedIn,adminController.addCoupon)

router.post('/addCoupon',isAdminLoggedIn,adminController.insertCoupon)

//sales report
router.get('/salesReport/:page',isAdminLoggedIn,adminController.loadSalesReport)

//download sales report in pdf
router.get('/downloadSalesPdf',isAdminLoggedIn,adminController.downloadSalesPdf)

router.get('/downloadSalesExcel',isAdminLoggedIn,adminController.downloadSalesExcel)

//filter sales
router.get('/filterSales',isAdminLoggedIn,adminController.filterSales)

///mange order returns
router.get('/manageReturns/:page',isAdminLoggedIn,adminController.manageReturns)

router.post('/returnAction',isAdminLoggedIn,adminController.orderReturnAction)

//banner management
router.get('/manageBanner',adminController.loadBanners)

//add new banner
router.get('/addBanner',adminController.addBanner)

router.post('/uploadBannerImage',upload.single('bannerImg'),adminController.uploadBannerImage)

router.post('/insertBanner',upload.single('bannerImg'),adminController.insertNewBanner)

router.post('/deleteBanner',adminController.deleteBanner)

router.get('/editBanner',adminController.editBanner)

router.post('/editBanner',upload.single('bannerImg'),adminController.updateBanner)

router.get('/logout',isAdminLoggedIn,(req,res)=>{
    req.session.admin = null
    res.redirect('/admin/login')
})


module.exports = router