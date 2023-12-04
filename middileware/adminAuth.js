const isAdminLoggedIn = ((req, res, next) => {
    if (req.session.admin) {
        next()
    }
    else {
        res.redirect('/admin/login')
    }
})

const isAdminLoggedOut = ((req, res, next) => {
    if (!req.session.admin) {
        next()
    }
    else {
        res.redirect('/admin/dashboard')
    }
})


module.exports = { isAdminLoggedIn, isAdminLoggedOut }