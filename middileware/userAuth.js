const { user } = require('../database/mongodb')


const isUserLoggedIn = (async (req, res, next) => {
    if (req.session.user) {
        const userdata = await user.findOne({ username:req.session.user })
        console.log("Userdata :",userdata)
        if (userdata.isBlocked === true) {
            req.session.user = null
            req.session._id = null
            res.render('./User/login', { title: "Login", loginErr: "Restricted Account." })
            console.log("Blocked User")
            res.end()
        }
        else{
            next()
        }
    }
    else {
        res.redirect('/user/login')
    }
})

const isUserLoggedOut = ((req, res, next) => {
    if (!req.session.user) {
        next()
    }
    else {
        res.redirect('/')
    }
})




module.exports = { isUserLoggedIn, isUserLoggedOut }